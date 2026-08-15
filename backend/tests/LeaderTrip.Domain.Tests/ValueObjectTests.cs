using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Tests;

public class CoordinateTests
{
    [Theory]
    [InlineData(91, 0)]
    [InlineData(-91, 0)]
    [InlineData(0, 181)]
    [InlineData(0, -181)]
    public void Create_RejectsOutOfRangeValues(double latitude, double longitude)
    {
        var result = Coordinate.Create(latitude, longitude);

        Assert.True(result.IsFailure);
        Assert.NotEqual(string.Empty, result.Error.Code);
    }

    [Fact]
    public void StraightLineTo_MatchesKnownDistance()
    {
        // فاصلهٔ هوایی تهران تا اصفهان حدود ۳۴۰ کیلومتر است
        var distance = TestData.Tehran.StraightLineTo(TestData.Isfahan);

        Assert.InRange(distance.Kilometers, 320, 360);
    }

    [Fact]
    public void StraightLineTo_IsZeroForSamePoint() =>
        Assert.Equal(0, TestData.Tehran.StraightLineTo(TestData.Tehran).Kilometers, 6);

    [Fact]
    public void StraightLineTo_IsSymmetric()
    {
        var there = TestData.Tehran.StraightLineTo(TestData.Isfahan).Kilometers;
        var back = TestData.Isfahan.StraightLineTo(TestData.Tehran).Kilometers;

        Assert.Equal(there, back, 6);
    }

    [Fact]
    public void EqualCoordinates_AreEqual_BecauseItIsAValueObject()
    {
        var a = Coordinate.Create(35.5, 51.5).Value;
        var b = Coordinate.Create(35.5, 51.5).Value;

        Assert.Equal(a, b);
    }
}

public class MoneyTests
{
    [Fact]
    public void Create_RejectsNegative() =>
        Assert.True(Money.Create(-1).IsFailure);

    [Fact]
    public void Arithmetic_KeepsExactDecimalPrecision()
    {
        // با double این جمع ۰٫۰۰۰۰۰۰۰۰۰۱ خطا می‌داد؛ با decimal دقیق است
        var total = Money.FromToman(0.1m) + Money.FromToman(0.2m);

        Assert.Equal(0.3m, total.Amount);
    }

    [Fact]
    public void Comparison_WorksByAmount() =>
        Assert.True(Money.FromToman(500) > Money.FromToman(499));
}

public class DistanceTests
{
    [Fact]
    public void FromKilometers_ClampsNegativeToZero() =>
        Assert.Equal(0, Distance.FromKilometers(-5).Kilometers);

    [Fact]
    public void Multiply_ScalesCorrectly() =>
        Assert.Equal(125, (Distance.FromKilometers(100) * 1.25).Kilometers, 6);
}
