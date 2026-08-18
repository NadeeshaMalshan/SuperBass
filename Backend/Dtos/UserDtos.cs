namespace Superbass.Dtos;

public record UpdateUserDto(string? Name, string? PhoneNumber, string? Address);
public record DeleteAccountDto(string ConfirmationText);