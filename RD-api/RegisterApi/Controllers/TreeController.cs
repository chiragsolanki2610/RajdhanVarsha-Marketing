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
    [Authorize]
    public class TreeController : ControllerBase
    {
        private readonly AppDbContext _db;
        private const int MaxLevel = 12;

        public TreeController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> GetDownlineTree()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                          ?? User.FindFirst("UserId")?.Value;

                if (string.IsNullOrWhiteSpace(userId))
                    return Unauthorized(new { message = "Invalid or expired session token." });

                var user = await _db.Users
                    .FirstOrDefaultAsync(u => u.UserId == userId.Trim());

                if (user == null)
                    return NotFound(new { message = "Distributor profile missing in system ledger." });

                var treeResponse = await BuildTreeRecursiveAsync(user, currentLevel: 0);

                return Ok(treeResponse);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Matrix canvas node generation failure", details = ex.Message });
            }
        }

        /// <summary>
        /// Recursively builds the full tree up to MaxLevel (12).
        /// Each node fetches its OWN direct children using SponsorId = node.UserId.
        /// </summary>
        private async Task<TreeResponseDto> BuildTreeRecursiveAsync(User node, int currentLevel)
        {
            var dto = await BuildNodeDtoAsync(node, currentLevel);

            // Stop recursing beyond level 12
            if (currentLevel >= MaxLevel)
            {
                dto.HasChildren = false;
                dto.Children = new List<TreeResponseDto>();
                return dto;
            }

            // Fetch children of THIS specific node (not the logged-in user)
            var directChildren = await _db.Users
                .Where(u => u.SponsorId == node.UserId)
                .OrderBy(u => u.UserId)
                .Take(10)
                .ToListAsync();

            foreach (var child in directChildren)
            {
                var childDto = await BuildTreeRecursiveAsync(child, currentLevel + 1);
                dto.Children.Add(childDto);
            }

            dto.HasChildren = dto.Children.Count > 0;
            dto.TotalIncentive = dto.EstimatedEarnings + SumDescendantEarnings(dto.Children);

            return dto;
        }

        /// <summary>
        /// Recursively sums EstimatedEarnings across all descendants (children, grandchildren, ... up to level 12).
        /// </summary>
        private double SumDescendantEarnings(List<TreeResponseDto> children)
        {
            double sum = 0;
            foreach (var child in children)
            {
                sum += child.EstimatedEarnings;
                sum += SumDescendantEarnings(child.Children);
            }
            return sum;
        }

        /// <summary>
        /// Builds a single node DTO.
        /// BV is taken directly from User.BusinessVolume — the same field
        /// returned as bvPoints on the profile/dashboard, ensuring consistency everywhere.
        /// </summary>
        private async Task<TreeResponseDto> BuildNodeDtoAsync(User node, int level)
        {
            var directCount = await _db.Users.CountAsync(u => u.SponsorId == node.UserId);

            // ✅ Use BusinessVolume directly from the User record.
            // This is the single source of truth — same value shown on dashboard as bvPoints.
            // Avoids double-counting from multiple Plan records or mismatches with order BV.
            var realBv = (decimal)node.BusinessVolume;

            var dto = new TreeResponseDto
            {
                Id = node.UserId,
                Name = node.Name,
                SponsorId = node.SponsorId ?? string.Empty,
                SponsorName = node.SponsorIdName ?? string.Empty,
                IdStatus = node.IdStatus ?? "inactive",
                Level = level,
                DirectCount = directCount,
                CalculatedBv = (int)realBv,
                HasChildren = directCount > 0,
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
