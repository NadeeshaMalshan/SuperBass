using Microsoft.AspNetCore.Mvc;
using Google.Apis.Auth;
using System.Threading.Tasks;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using System.Security.Cryptography;
using Superbass.Models;


namespace Superbass.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly SuperbassDbContext _dbContext;

        public AuthController(IConfiguration configuration, IHttpClientFactory httpClientFactory, SuperbassDbContext dbContext)
        {
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
            _dbContext = dbContext;
        }

        [HttpPost("google")]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request)
        {
            string? tokenToValidate = !string.IsNullOrWhiteSpace(request.AccessToken)
                ? request.AccessToken
                : request.IdToken;

            if (string.IsNullOrWhiteSpace(tokenToValidate))
            {
                return BadRequest(new { message = "Token is required." });
            }

            string? sub = null;
            string? email = null;
            string? name = null;
            string? picture = null;

            // 1. Try validating as JWT ID Token (if token format has 3 parts separated by dots)
            if (tokenToValidate.Split('.').Length == 3)
            {
                try
                {
                    var payload = await GoogleJsonWebSignature.ValidateAsync(tokenToValidate);
                    sub = payload.Subject;
                    email = payload.Email;
                    name = payload.Name;
                    picture = payload.Picture;
                }
                catch (InvalidJwtException)
                {
                    // If ID token validation fails, fall through to access token validation
                }
            }

            // 2. If not verified yet, validate as Google Access Token via Google UserInfo API
            if (string.IsNullOrEmpty(email))
            {
                try
                {
                    var client = _httpClientFactory.CreateClient();
                    var requestMsg = new HttpRequestMessage(HttpMethod.Get, "https://www.googleapis.com/oauth2/v3/userinfo");
                    requestMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenToValidate);

                    var response = await client.SendAsync(requestMsg);
                    if (response.IsSuccessStatusCode)
                    {
                        var content = await response.Content.ReadAsStringAsync();
                        using var doc = JsonDocument.Parse(content);
                        var root = doc.RootElement;

                        if (root.TryGetProperty("sub", out var subProp)) sub = subProp.GetString();
                        if (root.TryGetProperty("email", out var emailProp)) email = emailProp.GetString();
                        if (root.TryGetProperty("name", out var nameProp)) name = nameProp.GetString();
                        if (root.TryGetProperty("picture", out var picProp)) picture = picProp.GetString();
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error validating access token: {ex.Message}");
                }
            }

            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(sub))
            {
                return Unauthorized(new { message = "Invalid Google token." });
            }

            // Generate JWT for our application
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_configuration["Authentication:Jwt:Secret"] ?? "super_secret_key_that_must_be_long_enough_12345");
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, sub),
                    new Claim(ClaimTypes.Email, email),
                    new Claim(ClaimTypes.Name, name ?? email)
                }),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);
            var jwt = tokenHandler.WriteToken(token);

            var jwtHash = Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(jwt)));

            bool isNewUser = false;
            var resident = await _dbContext.Residents.FindAsync(email);
            if (resident == null)
            {
                isNewUser = true;
                resident = new Resident
                {
                    Email = email,
                    Name = name ?? email,
                    PasswordHash = jwtHash,
                    PhoneNumber = request.PhoneNumber,
                    Address = request.Address,
                    LocationLat = request.LocationLat,
                    LocationLng = request.LocationLng
                };
                _dbContext.Residents.Add(resident);
            }
            else
            {
                resident.PasswordHash = jwtHash;
                if (request.PhoneNumber != null) resident.PhoneNumber = request.PhoneNumber;
                if (request.Address != null) resident.Address = request.Address;
                if (request.LocationLat != null) resident.LocationLat = request.LocationLat;
                if (request.LocationLng != null) resident.LocationLng = request.LocationLng;
            }
            await _dbContext.SaveChangesAsync();

            return Ok(new { token = jwt, email = email, name = name ?? email, picture = picture, isNewUser = isNewUser });
        }

        [HttpPost("onboarding")]
        public async Task<IActionResult> Onboarding([FromBody] OnboardingRequest request)
        {
            var authHeader = Request.Headers["Authorization"].FirstOrDefault();
            if (authHeader == null || !authHeader.StartsWith("Bearer "))
                return Unauthorized(new { message = "Missing or invalid Authorization header." });

            var token = authHeader.Substring("Bearer ".Length).Trim();
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_configuration["Authentication:Jwt:Secret"] ?? "super_secret_key_that_must_be_long_enough_12345");
            
            try
            {
                tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ClockSkew = TimeSpan.Zero
                }, out SecurityToken validatedToken);

                var jwtToken = (JwtSecurityToken)validatedToken;
                var emailClaim = jwtToken.Claims.FirstOrDefault(x => x.Type == ClaimTypes.Email || x.Type == "email" || x.Type.Contains("emailaddress"));
                if (emailClaim == null) return Unauthorized(new { message = "Email claim not found in token." });
                var email = emailClaim.Value;

                var resident = await _dbContext.Residents.FindAsync(email);
                if (resident == null) return NotFound(new { message = "User not found." });

                resident.PhoneNumber = request.PhoneNo;
                resident.Address = request.Address;
                resident.LocationLat = request.LocationLat;
                resident.LocationLng = request.LocationLng;

                await _dbContext.SaveChangesAsync();
                return Ok(new { message = "Profile updated successfully." });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Token validation failed: {ex.ToString()}");
                return Unauthorized(new { message = "Invalid token." });
            }
        }
    }

    public class GoogleLoginRequest
    {
        public string? IdToken { get; set; }
        public string? AccessToken { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Address { get; set; }
        public double? LocationLat { get; set; }
        public double? LocationLng { get; set; }
    }

    public class OnboardingRequest
    {
        public string? PhoneNo { get; set; }
        public string? Address { get; set; }
        public double? LocationLat { get; set; }
        public double? LocationLng { get; set; }
    }
}
