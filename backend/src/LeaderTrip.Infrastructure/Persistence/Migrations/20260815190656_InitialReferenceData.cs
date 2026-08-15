using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace LeaderTrip.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialReferenceData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "cities",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    province = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    lat = table.Column<double>(type: "double precision", nullable: false),
                    lng = table.Column<double>(type: "double precision", nullable: false),
                    cost_index = table.Column<decimal>(type: "numeric(4,2)", precision: 4, scale: 2, nullable: false),
                    amenities = table.Column<int>(type: "integer", nullable: false),
                    climate = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_cities", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "price_books",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    payload = table.Column<string>(type: "jsonb", nullable: false),
                    effective_from = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_price_books", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "vehicles",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    label = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    @class = table.Column<string>(name: "class", type: "character varying(32)", maxLength: 32, nullable: false),
                    fuel = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    consumption_per100km = table.Column<double>(type: "double precision", nullable: false),
                    seats = table.Column<int>(type: "integer", nullable: false),
                    offroad = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    speed_factor = table.Column<double>(type: "double precision", nullable: false),
                    depreciation_per_km = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    toll_factor = table.Column<decimal>(type: "numeric(4,2)", precision: 4, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_vehicles", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "pois",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    city_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    lat = table.Column<double>(type: "double precision", nullable: false),
                    lng = table.Column<double>(type: "double precision", nullable: false),
                    category = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    rating = table.Column<double>(type: "double precision", nullable: false),
                    visit_minutes = table.Column<int>(type: "integer", nullable: false),
                    ticket = table.Column<decimal>(type: "numeric(14,0)", precision: 14, scale: 0, nullable: false),
                    best_months = table.Column<int[]>(type: "integer[]", nullable: false),
                    indoor = table.Column<bool>(type: "boolean", nullable: false),
                    difficulty = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    min_age = table.Column<int>(type: "integer", nullable: false),
                    kid_friendly = table.Column<bool>(type: "boolean", nullable: false),
                    senior_friendly = table.Column<bool>(type: "boolean", nullable: false),
                    required_vehicle = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    night_suitable = table.Column<bool>(type: "boolean", nullable: false),
                    tags = table.Column<string[]>(type: "text[]", nullable: false),
                    description = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_pois", x => x.id);
                    table.ForeignKey(
                        name: "fk_pois_cities_city_id",
                        column: x => x.city_id,
                        principalTable: "cities",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_cities_province",
                table: "cities",
                column: "province");

            migrationBuilder.CreateIndex(
                name: "ix_pois_category",
                table: "pois",
                column: "category");

            migrationBuilder.CreateIndex(
                name: "ix_pois_city_id",
                table: "pois",
                column: "city_id");

            migrationBuilder.CreateIndex(
                name: "ix_price_books_effective_from",
                table: "price_books",
                column: "effective_from");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "pois");

            migrationBuilder.DropTable(
                name: "price_books");

            migrationBuilder.DropTable(
                name: "vehicles");

            migrationBuilder.DropTable(
                name: "cities");
        }
    }
}
