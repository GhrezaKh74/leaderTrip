using System.Globalization;
using System.Security.Cryptography;

namespace LeaderTrip.Application.Auth;

/// <summary>PBKDF2-SHA256 با نمک تصادفی و شمارش تکرار داخل خود رشته.</summary>
/// <remarks>
/// <para>
/// چرا PBKDF2 و نه bcrypt/argon2: در BCL است — بدون بستهٔ بیرونی، بدون ریسک
/// زنجیرهٔ تأمین برای حساس‌ترین تکهٔ سامانه. با ۲۱۰هزار تکرار (توصیهٔ OWASP
/// برای SHA-256) در همان ردهٔ مقاومت است.
/// </para>
/// <para>
/// قالب: <c>pbkdf2$تکرار$نمک$هش</c>. شمارش داخل رشته یعنی بالابردنش در آینده،
/// گذرواژه‌های قدیمی را نمی‌شکند — هر رکورد با شمارش خودش سنجیده می‌شود.
/// </para>
/// </remarks>
public sealed class Pbkdf2PasswordHasher : IPasswordHasher
{
    private const int Iterations = 210_000;
    private const int SaltBytes = 16;
    private const int HashBytes = 32;

    public string Hash(string password)
    {
        ArgumentNullException.ThrowIfNull(password);

        byte[] salt = RandomNumberGenerator.GetBytes(SaltBytes);
        byte[] hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, HashBytes);

        return string.Create(
            CultureInfo.InvariantCulture,
            $"pbkdf2${Iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}");
    }

    public bool Verify(string password, string hash)
    {
        ArgumentNullException.ThrowIfNull(password);
        ArgumentNullException.ThrowIfNull(hash);

        string[] parts = hash.Split('$');

        if (parts.Length != 4 || parts[0] != "pbkdf2")
        {
            return false;
        }

        if (!int.TryParse(parts[1], NumberStyles.None, CultureInfo.InvariantCulture, out int iterations)
            || iterations < 1_000)
        {
            return false;
        }

        byte[] salt;
        byte[] expected;

        try
        {
            salt = Convert.FromBase64String(parts[2]);
            expected = Convert.FromBase64String(parts[3]);
        }
        catch (FormatException)
        {
            return false;
        }

        byte[] actual = Rfc2898DeriveBytes.Pbkdf2(
            password, salt, iterations, HashAlgorithmName.SHA256, expected.Length);

        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }
}
