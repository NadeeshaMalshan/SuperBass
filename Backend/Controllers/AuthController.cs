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

namespace Superbass.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;

        public AuthController(IConfiguration configuration, IHttpClientFactory httpClientFactory)
        {
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
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

            // 1. Try validating as JWT ID Token (if token format has 3 parts separated by dots)
            if (tokenToValidate.Split('.').Length == 3)
            {
                try
                {
                    var payload = await GoogleJsonWebSignature.ValidateAsync(tokenToValidate);
                    sub = payload.Subject;
                    email = payload.Email;
                    name = payload.Name;
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

            return Ok(new { token = jwt, email = email, name = name ?? email });
        }
    }

    public class GoogleLoginRequest
    {
        public string? IdToken { get; set; }
        public string? AccessToken { get; set; }
    }
}
