using LeaderTrip.Application.Auth;

namespace LeaderTrip.Infrastructure.Tests;

public sealed class Pbkdf2PasswordHasherTests
{
    private readonly Pbkdf2PasswordHasher _hasher = new();

    [Fact]
    public void CorrectPassword_Verifies()
    {
        string hash = _hasher.Hash("رمز-خیلی-محرمانه-۱۲۳");

        Assert.True(_hasher.Verify("رمز-خیلی-محرمانه-۱۲۳", hash));
    }

    [Fact]
    public void WrongPassword_DoesNotVerify()
    {
        string hash = _hasher.Hash("password-one");

        Assert.False(_hasher.Verify("password-two", hash));
    }

    /// <summary>نمک تصادفی: دو هش از یک گذرواژه نباید یکی باشند — وگرنه جدول رنگین‌کمانی کار می‌کند.</summary>
    [Fact]
    public void SamePassword_ProducesDifferentHashes()
    {
        Assert.NotEqual(_hasher.Hash("same"), _hasher.Hash("same"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("plaintext")]
    [InlineData("pbkdf2$abc$!!$??")]
    [InlineData("pbkdf2$10$c2FsdA==$aGFzaA==")]
    public void MalformedOrWeakHash_NeverVerifies(string hash)
    {
        Assert.False(_hasher.Verify("anything", hash));
    }
}
