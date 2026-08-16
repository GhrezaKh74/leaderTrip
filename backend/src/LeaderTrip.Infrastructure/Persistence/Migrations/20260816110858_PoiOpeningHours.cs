using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LeaderTrip.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PoiOpeningHours : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "closes_at",
                table: "pois",
                type: "character varying(5)",
                maxLength: 5,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "opens_at",
                table: "pois",
                type: "character varying(5)",
                maxLength: 5,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "closes_at",
                table: "pois");

            migrationBuilder.DropColumn(
                name: "opens_at",
                table: "pois");
        }
    }
}
