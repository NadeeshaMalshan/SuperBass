using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace Superbass.Services;

public interface IPushNotificationService
{
    Task SendPushNotificationAsync(string recipientEmail, string title, string message, Dictionary<string, string>? data = null);
}

public class PushNotificationService : IPushNotificationService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PushNotificationService> _logger;

    public PushNotificationService(HttpClient httpClient, IConfiguration configuration, ILogger<PushNotificationService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendPushNotificationAsync(string recipientEmail, string title, string message, Dictionary<string, string>? data = null)
    {
        if (string.IsNullOrWhiteSpace(recipientEmail))
        {
            _logger.LogWarning("Push notification skipped: recipientEmail is empty.");
            return;
        }

        var appId = _configuration["OneSignal:AppId"] 
            ?? Environment.GetEnvironmentVariable("OneSignal__AppId") 
            ?? "b7e6df63-34ca-4bbd-8889-b8844c9b579b";

        var apiKey = _configuration["OneSignal:RestApiKey"] 
            ?? Environment.GetEnvironmentVariable("OneSignal__RestApiKey");

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogWarning("OneSignal REST API key is not configured. Push notification to {Email} not sent.", recipientEmail);
            return;
        }

        try
        {
            var request = new HttpRequestMessage(HttpMethod.Post, "https://onesignal.com/api/v1/notifications");
            // OneSignal API accepts "Key <key>" or "Basic <key>"
            request.Headers.TryAddWithoutValidation("Authorization", apiKey.StartsWith("os_v2_") ? $"Key {apiKey}" : $"Basic {apiKey}");

            var payload = new
            {
                app_id = appId,
                include_aliases = new
                {
                    external_id = new[] { recipientEmail.Trim().ToLowerInvariant() }
                },
                target_channel = "push",
                headings = new { en = title },
                contents = new { en = message },
                data = data ?? new Dictionary<string, string>()
            };

            var json = JsonSerializer.Serialize(payload);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to send OneSignal push notification to {Email}. Status: {Status}, Response: {Response}",
                    recipientEmail, response.StatusCode, responseBody);
            }
            else
            {
                _logger.LogInformation("Successfully sent OneSignal push notification to {Email}. Response: {Response}",
                    recipientEmail, responseBody);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception while sending OneSignal push notification to {Email}", recipientEmail);
        }
    }
}
