using System.Security.Cryptography;
using System.Text;

namespace RegisterApi.Services;

public interface IPasswordService
{
    string GeneratePassword(int length = 10);
    string HashPassword(string plainText);
    bool VerifyPassword(string plainText, string hash);
}

public class PasswordService : IPasswordService
{
    private const string LowerCase = "abcdefghjkmnpqrstuvwxyz";
    private const string UpperCase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private const string Digits    = "23456789";
    private const string Symbols   = "@#$!%*?&";

    /// <summary>
    /// Generates a random password guaranteed to contain at least one character
    /// from each category (upper, lower, digit, symbol).
    /// </summary>
    public string GeneratePassword(int length = 10)
    {
        if (length < 8) length = 10;

        var allChars = LowerCase + UpperCase + Digits + Symbols;
        var passwordChars = new char[length];

        // Ensure at least one from each category
        passwordChars[0] = Pick(UpperCase);
        passwordChars[1] = Pick(LowerCase);
        passwordChars[2] = Pick(Digits);
        passwordChars[3] = Pick(Symbols);

        // Fill remainder randomly
        for (int i = 4; i < length; i++)
            passwordChars[i] = Pick(allChars);

        // Shuffle to avoid predictable pattern at start
        return new string(Shuffle(passwordChars));
    }

    public string HashPassword(string plainText)
        => BCrypt.Net.BCrypt.HashPassword(plainText, workFactor: 12);

    public bool VerifyPassword(string plainText, string hash)
        => BCrypt.Net.BCrypt.Verify(plainText, hash);

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static char Pick(string chars)
        => chars[RandomNumberGenerator.GetInt32(chars.Length)];

    private static char[] Shuffle(char[] chars)
    {
        for (int i = chars.Length - 1; i > 0; i--)
        {
            int j = RandomNumberGenerator.GetInt32(i + 1);
            (chars[i], chars[j]) = (chars[j], chars[i]);
        }
        return chars;
    }
}
