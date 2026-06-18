using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using RegisterApi.Data;
using RegisterApi.Models;
using RegisterApi.DTOs;

namespace RegisterApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]                                          // ← ADDED
    public class TreeController : ControllerBase
    {
        private readonly AppDbContext _db;

        public TreeController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> GetDownlineTree([FromQuery] int currentLevel = 0)  // ← REMOVED userId param
        {
            try
            {
                // ← ADDED: get userId from JWT token instead of query param
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                          ?? User.FindFirst("UserId")?.Value;

                if (string.IsNullOrWhiteSpace(userId))
                    return Unauthorized(new { message = "Invalid or expired session token." });

                var user = await _db.Users
                    .FirstOrDefaultAsync(u => u.UserId == userId.Trim());

                if (user == null)
                {
                    return NotFound(new { message = "Distributor profile missing in system ledger." });
                }

                var treeResponse = await BuildNodeDtoAsync(user, currentLevel);

                if (treeResponse.HasChildren && currentLevel < 12)
                {
                    var directChildren = await _db.Users
                        .Where(u => u.SponsorId == user.UserId)
                        .OrderBy(u => u.UserId)
                        .Take(10)
                        .ToListAsync();

                    foreach (var child in directChildren)
                    {
                        var childDto = await BuildNodeDtoAsync(child, currentLevel + 1);
                        treeResponse.Children.Add(childDto);
                    }
                }

                return Ok(treeResponse);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Matrix canvas node generation failure", details = ex.Message });
            }
        }

        private async Task<TreeResponseDto> BuildNodeDtoAsync(User node, int level)
        {
            var directCount = await _db.Users.CountAsync(u => u.SponsorId == node.UserId);

            var dto = new TreeResponseDto
            {
                Id = node.UserId,
                Name = node.Name,
                SponsorId = node.SponsorId ?? string.Empty,
                SponsorName = node.SponsorIdName,
                Level = level,
                DirectCount = directCount,
                HasChildren = directCount > 0
            };

            dto.LevelCommissionPercentage = level switch
            {
                0 => 10.0,
                1 => 10.0,
                2 => 7.0,
                3 => 5.0,
                4 => 4.0,
                5 => 4.0,
                6 => 3.0,
                7 => 3.0,
                8 => 2.0,
                9 => 2.0,
                10 => 2.0,
                11 => 1.0,
                12 => 1.0,
                _ => 0.0
            };

            dto.EstimatedEarnings = dto.CalculatedBv * (dto.LevelCommissionPercentage / 100.0);
            return dto;
        }
    }
}