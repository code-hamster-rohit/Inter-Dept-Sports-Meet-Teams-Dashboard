/**
 * Inter-Dept Sports Meet 2026 - Teams Viewer Dashboard
 * Dynamic Client-Side Controller
 */

(function () {
  "use strict";

  function getInitialTeams() {
    if (window.__INITIAL_TEAMS__ && Array.isArray(window.__INITIAL_TEAMS__) && window.__INITIAL_TEAMS__.length > 0) {
      return window.__INITIAL_TEAMS__;
    }
    try {
      const dataEl = document.getElementById("initial-teams-data");
      if (dataEl && dataEl.textContent.trim()) {
        const parsed = JSON.parse(dataEl.textContent);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return [];
  }

  // Application State
  const state = {
    teams: getInitialTeams(),
    filteredTeams: getInitialTeams(),
    filters: {
      search: "",
      department: "all",
      sport: "all",
      category: "all",
      sortBy: "sport-asc",
    },
    viewMode: "grid", // 'grid' | 'table'
    selectedTeam: null,
  };

  // DOM Elements
  const searchInput = document.getElementById("search-input");
  const sportSelect = document.getElementById("sport-filter-select");
  const categorySelect = document.getElementById("category-filter-select");
  const sortSelect = document.getElementById("sort-select");
  const deptTabButtons = document.querySelectorAll(".dept-tab-btn");
  const viewGridBtn = document.getElementById("btn-view-grid");
  const viewTableBtn = document.getElementById("btn-view-table");
  const gridContainer = document.getElementById("teams-grid-view");
  const tableContainer = document.getElementById("teams-table-view");
  const tableBody = document.getElementById("teams-table-body");
  const emptyStateBox = document.getElementById("empty-state");
  const resetFiltersBtn = document.getElementById("btn-reset-filters");
  const refreshDataBtn = document.getElementById("btn-refresh-data");
  const resultsCountEl = document.getElementById("results-count");
  const totalCountEl = document.getElementById("total-count");

  // Modal Elements
  const modalBackdrop = document.getElementById("team-detail-modal");
  const modalCloseBtn = document.getElementById("btn-close-modal");
  const modalCopyBtn = document.getElementById("btn-modal-copy-roster");
  const modalPrintBtn = document.getElementById("btn-modal-print");

  /**
   * Initialize application and bind event listeners
   */
  function init() {
    bindEvents();
    if (!state.teams || state.teams.length === 0) {
      state.teams = getInitialTeams();
      state.filteredTeams = [...state.teams];
    }
    applyFilters();
    if (!state.teams || state.teams.length === 0) {
      refreshData();
    }
  }

  function bindEvents() {
    // Search with debounce
    let debounceTimer;
    if (searchInput) {
      searchInput.addEventListener("input", function (e) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          state.filters.search = e.target.value.trim().toLowerCase();
          applyFilters();
        }, 180);
      });
    }

    // Sport dropdown
    if (sportSelect) {
      sportSelect.addEventListener("change", function (e) {
        state.filters.sport = e.target.value;
        applyFilters();
      });
    }

    // Category dropdown
    if (categorySelect) {
      categorySelect.addEventListener("change", function (e) {
        state.filters.category = e.target.value;
        applyFilters();
      });
    }

    // Sort dropdown
    if (sortSelect) {
      sortSelect.addEventListener("change", function (e) {
        state.filters.sortBy = e.target.value;
        applyFilters();
      });
    }

    // Department tabs
    deptTabButtons.forEach((btn) => {
      btn.addEventListener("click", function () {
        deptTabButtons.forEach((b) => b.classList.remove("active"));
        this.classList.add("active");
        state.filters.department = this.getAttribute("data-dept") || "all";
        applyFilters();
      });
    });

    // View mode toggles
    if (viewGridBtn && viewTableBtn) {
      viewGridBtn.addEventListener("click", () => switchViewMode("grid"));
      viewTableBtn.addEventListener("click", () => switchViewMode("table"));
    }

    // Reset filters button
    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener("click", resetFilters);
    }

    // Refresh data button
    if (refreshDataBtn) {
      refreshDataBtn.addEventListener("click", refreshData);
    }

    // Modal close events
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener("click", closeModal);
    }
    if (modalBackdrop) {
      modalBackdrop.addEventListener("click", function (e) {
        if (e.target === modalBackdrop) {
          closeModal();
        }
      });
    }

    // Modal Copy Roster button
    if (modalCopyBtn) {
      modalCopyBtn.addEventListener("click", copyCurrentTeamRoster);
    }

    // Modal Print button
    if (modalPrintBtn) {
      modalPrintBtn.addEventListener("click", () => window.print());
    }

    // Global keyboard listener for Esc key
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modalBackdrop.classList.contains("active")) {
        closeModal();
      }
    });
  }

  /**
   * Filter and sort teams according to current state
   */
  function applyFilters() {
    let result = [...state.teams];

    // 1. Department filter
    if (state.filters.department !== "all") {
      result = result.filter(
        (t) => (t.department_code || "").toLowerCase() === state.filters.department.toLowerCase()
      );
    }

    // 2. Sport filter
    if (state.filters.sport !== "all") {
      result = result.filter((t) => t.sport_id === state.filters.sport);
    }

    // 3. Category filter
    if (state.filters.category !== "all") {
      result = result.filter(
        (t) => (t.category || "").toLowerCase() === state.filters.category.toLowerCase()
      );
    }

    // 4. Search query
    if (state.filters.search) {
      const q = state.filters.search;
      result = result.filter((t) => {
        if ((t.sport_name || "").toLowerCase().includes(q)) return true;
        if ((t.department || "").toLowerCase().includes(q)) return true;
        if ((t.department_name || "").toLowerCase().includes(q)) return true;
        if ((t.captain?.name || "").toLowerCase().includes(q)) return true;
        if ((t.captain?.email || "").toLowerCase().includes(q)) return true;
        if ((t.captain?.student_id || "").toLowerCase().includes(q)) return true;

        // Search in main squad and subs
        for (const m of t.all_members || []) {
          if ((m.name || "").toLowerCase().includes(q)) return true;
          if ((m.email || "").toLowerCase().includes(q)) return true;
          if ((m.student_id || "").toLowerCase().includes(q)) return true;
        }
        return false;
      });
    }

    // 5. Sorting
    result.sort((a, b) => {
      switch (state.filters.sortBy) {
        case "sport-asc":
          return (a.sport_name || "").localeCompare(b.sport_name || "");
        case "sport-desc":
          return (b.sport_name || "").localeCompare(a.sport_name || "");
        case "dept-asc":
          return (a.department || "").localeCompare(b.department || "");
        case "strength-desc":
          return (b.total_strength || 0) - (a.total_strength || 0);
        case "date-desc":
          return (b.created_at || "").localeCompare(a.created_at || "");
        default:
          return 0;
      }
    });

    state.filteredTeams = result;
    render();
  }

  /**
   * Switch between Grid and Table View
   */
  function switchViewMode(mode) {
    state.viewMode = mode;
    if (mode === "grid") {
      viewGridBtn.classList.add("active");
      viewTableBtn.classList.remove("active");
      gridContainer.style.display = "grid";
      tableContainer.style.display = "none";
    } else {
      viewTableBtn.classList.add("active");
      viewGridBtn.classList.remove("active");
      gridContainer.style.display = "none";
      tableContainer.style.display = "block";
    }
  }

  /**
   * Render active view (Grid or Table)
   */
  function render() {
    // Update counter labels
    if (resultsCountEl) resultsCountEl.textContent = state.filteredTeams.length;
    if (totalCountEl) totalCountEl.textContent = state.teams.length;

    // Check empty state
    if (state.filteredTeams.length === 0) {
      gridContainer.style.display = "none";
      tableContainer.style.display = "none";
      emptyStateBox.style.display = "block";
      return;
    } else {
      emptyStateBox.style.display = "none";
      if (state.viewMode === "grid") {
        gridContainer.style.display = "grid";
        tableContainer.style.display = "none";
      } else {
        gridContainer.style.display = "none";
        tableContainer.style.display = "block";
      }
    }

    // Render Grid
    renderGrid(state.filteredTeams);

    // Render Table
    renderTable(state.filteredTeams);
  }

  /**
   * Render Card Grid
   */
  function renderGrid(teams) {
    gridContainer.innerHTML = "";

    teams.forEach((t) => {
      const deptClass = (t.department_code || "").toLowerCase();
      const card = document.createElement("div");
      card.className = "team-card";
      card.style.setProperty("--dept-color", t.dept_badge_color || "#38bdf8");

      const captainInitials = getInitials(t.captain?.name || "CP");

      card.innerHTML = `
        <div>
          <div class="team-card-top">
            <div class="team-sport-group">
              <div class="sport-icon-bubble">${escapeHtml(t.sport_icon || "🏅")}</div>
              <div class="sport-meta">
                <h2 class="team-sport-title">${escapeHtml(t.sport_name || "")}</h2>
                <span class="team-category-tag">${escapeHtml(t.category || "")} · ${escapeHtml(t.squad_notation || "")}</span>
              </div>
            </div>
            <span class="badge-dept ${deptClass}">${escapeHtml(t.department || "")}</span>
          </div>

          <!-- Captain Spotlight -->
          <div class="captain-spotlight">
            <div class="captain-avatar">${escapeHtml(captainInitials)}</div>
            <div class="captain-details">
              <span class="captain-label">Team Captain</span>
              <span class="captain-name" title="${escapeHtml(t.captain?.name || "")}">${escapeHtml(t.captain?.name || "Unassigned")}</span>
              <div class="captain-meta-line">
                <span>${escapeHtml(t.captain?.email || "")}</span>
                ${t.captain?.student_id ? `<span>• ID: ${escapeHtml(t.captain.student_id)}</span>` : ""}
              </div>
            </div>
          </div>

          <!-- Squad Metrics -->
          <div class="squad-metrics-row">
            <div class="squad-stat-box">
              <div class="squad-stat-num">${t.total_strength || 0}</div>
              <div class="squad-stat-lbl">Total Squad</div>
            </div>
            <div class="squad-stat-box">
              <div class="squad-stat-num">${t.total_playing || 0}</div>
              <div class="squad-stat-lbl">Playing</div>
            </div>
            <div class="squad-stat-box">
              <div class="squad-stat-num">${t.total_substitutes || 0}</div>
              <div class="squad-stat-lbl">Subs</div>
            </div>
          </div>
        </div>

        <div class="team-card-footer">
          <span class="registration-time">${escapeHtml(t.created_at_formatted || "Registered")}</span>
          <button class="btn-view-roster" data-team-id="${escapeHtml(t.team_id)}">
            View Roster →
          </button>
        </div>
      `;

      // Click listener for View Roster button
      const btn = card.querySelector(".btn-view-roster");
      btn.addEventListener("click", () => openTeamModal(t));

      gridContainer.appendChild(card);
    });
  }

  /**
   * Render Table View
   */
  function renderTable(teams) {
    tableBody.innerHTML = "";

    teams.forEach((t) => {
      const deptClass = (t.department_code || "").toLowerCase();
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>
          <span class="badge-dept ${deptClass}">${escapeHtml(t.department || "")}</span>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.25rem;">${escapeHtml(t.sport_icon || "🏅")}</span>
            <div>
              <strong style="color: #fff;">${escapeHtml(t.sport_name || "")}</strong>
              <div style="font-size: 0.75rem; color: var(--text-dim);">${escapeHtml(t.category || "")}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="font-weight: 600; color: #fff;">${escapeHtml(t.captain?.name || "")}</div>
          <div style="font-size: 0.76rem; color: var(--text-muted);">${escapeHtml(t.captain?.email || "")}</div>
        </td>
        <td>
          <span style="font-family: var(--font-heading); font-weight: 700; color: #fff;">
            ${t.total_strength || 0}
          </span>
          <span style="font-size: 0.75rem; color: var(--text-dim);">
            (${t.total_playing || 0} playing + ${t.total_substitutes || 0} sub)
          </span>
        </td>
        <td style="font-size: 0.8rem; color: var(--text-dim);">
          ${escapeHtml(t.created_at_formatted || "")}
        </td>
        <td style="text-align: right;">
          <button class="btn-view-roster" style="padding: 6px 12px; font-size: 0.78rem;" data-team-id="${escapeHtml(t.team_id)}">
            View Roster
          </button>
        </td>
      `;

      const btn = tr.querySelector(".btn-view-roster");
      btn.addEventListener("click", () => openTeamModal(t));

      tableBody.appendChild(tr);
    });
  }

  /**
   * Open Squad Details Modal
   */
  function openTeamModal(team) {
    state.selectedTeam = team;

    // Header updates
    document.getElementById("modal-sport-icon").textContent = team.sport_icon || "🏅";
    document.getElementById("modal-team-title").textContent = `${team.department} · ${team.sport_name}`;
    document.getElementById("modal-team-subtitle").textContent = `${team.category} Category · ${team.squad_notation || ""}`;
    document.getElementById("modal-dept-badge").textContent = `${team.department} Dept`;
    document.getElementById("modal-dept-badge").className = `badge-dept ${(team.department_code || "").toLowerCase()}`;

    // Roster grid
    const rosterContainer = document.getElementById("modal-roster-grid");
    rosterContainer.innerHTML = "";

    // 1. Captain
    if (team.captain) {
      rosterContainer.appendChild(createPlayerTile(team.captain, "captain"));
    }

    // 2. Main Players
    (team.main_players || []).forEach((p) => {
      rosterContainer.appendChild(createPlayerTile(p, "main"));
    });

    // 3. Substitutes
    (team.substitutes || []).forEach((s) => {
      rosterContainer.appendChild(createPlayerTile(s, "sub"));
    });

    // Metadata
    document.getElementById("modal-reg-date").textContent = team.created_at_formatted || "Registered";
    document.getElementById("modal-team-id").textContent = `Team ID: ${team.team_id}`;

    modalBackdrop.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function createPlayerTile(player, roleType) {
    const tile = document.createElement("div");
    tile.className = `player-tile ${roleType === "captain" ? "is-captain" : ""} ${roleType === "sub" ? "is-sub" : ""}`;

    const badgeClass = roleType === "captain" ? "captain" : roleType === "sub" ? "sub" : "main";
    const roleLabel = roleType === "captain" ? "Captain" : roleType === "sub" ? (player.role || "Substitute") : (player.role || "Main Player");

    tile.innerHTML = `
      <div class="player-tile-info">
        <span class="player-tile-name" title="${escapeHtml(player.name || "")}">
          ${roleType === "captain" ? "👑 " : ""}${escapeHtml(player.name || "Unnamed Player")}
        </span>
        <span class="player-tile-email">${escapeHtml(player.email || "No Email")}</span>
        ${player.student_id ? `<span class="player-tile-id">ID: ${escapeHtml(player.student_id)} • ${escapeHtml(player.gender || "")}</span>` : `<span class="player-tile-id">${escapeHtml(player.gender || "")}</span>`}
      </div>
      <span class="player-role-badge ${badgeClass}">${escapeHtml(roleLabel)}</span>
    `;

    return tile;
  }

  function closeModal() {
    modalBackdrop.classList.remove("active");
    document.body.style.overflow = "";
    state.selectedTeam = null;
  }

  /**
   * Copy complete roster of currently selected team to clipboard
   */
  function copyCurrentTeamRoster() {
    const t = state.selectedTeam;
    if (!t) return;

    let text = `=========================================\n`;
    text += `INTER-DEPT SPORTS MEET 2026 - TEAM ROSTER\n`;
    text += `Department: ${t.department} (${t.department_name})\n`;
    text += `Sport: ${t.sport_name} (${t.category})\n`;
    text += `Total Squad: ${t.total_strength} (${t.total_playing} Playing, ${t.total_substitutes} Subs)\n`;
    text += `Registration Date: ${t.created_at_formatted}\n`;
    text += `-----------------------------------------\n`;
    text += `CAPTAIN:\n`;
    text += `  • ${t.captain?.name} | ${t.captain?.email} | ID: ${t.captain?.student_id || "N/A"} | ${t.captain?.gender || ""}\n`;

    if (t.main_players && t.main_players.length > 0) {
      text += `\nMAIN PLAYERS (${t.main_players.length}):\n`;
      t.main_players.forEach((p, idx) => {
        text += `  ${idx + 1}. ${p.name} | ${p.email} | ID: ${p.student_id || "N/A"} | ${p.gender || ""}\n`;
      });
    }

    if (t.substitutes && t.substitutes.length > 0) {
      text += `\nSUBSTITUTES (${t.substitutes.length}):\n`;
      t.substitutes.forEach((s, idx) => {
        text += `  ${idx + 1}. ${s.name} | ${s.email} | ID: ${s.student_id || "N/A"} | ${s.gender || ""}\n`;
      });
    }
    text += `=========================================\n`;

    navigator.clipboard
      .writeText(text)
      .then(() => {
        showToast("✓ Team roster copied to clipboard!");
      })
      .catch(() => {
        showToast("Error copying to clipboard", true);
      });
  }

  /**
   * Reset all search and filter controls
   */
  function resetFilters() {
    state.filters.search = "";
    state.filters.department = "all";
    state.filters.sport = "all";
    state.filters.category = "all";
    state.filters.sortBy = "sport-asc";

    if (searchInput) searchInput.value = "";
    if (sportSelect) sportSelect.value = "all";
    if (categorySelect) categorySelect.value = "all";
    if (sortSelect) sortSelect.value = "sport-asc";

    deptTabButtons.forEach((b) => {
      b.classList.remove("active");
      if ((b.getAttribute("data-dept") || "all") === "all") {
        b.classList.add("active");
      }
    });

    applyFilters();
    showToast("Filters reset");
  }

  /**
   * Refresh data from server via /api/teams
   */
  function refreshData() {
    if (refreshDataBtn) {
      refreshDataBtn.classList.add("spinning");
    }

    fetch("/api/teams")
      .then((res) => res.json())
      .then((data) => {
        if (data.teams) {
          state.teams = data.teams;
          applyFilters();
          showToast(`✓ Refreshed! ${data.teams.length} teams loaded.`);
        }
      })
      .catch((err) => {
        showToast("Failed to refresh data: " + err.message, true);
      })
      .finally(() => {
        setTimeout(() => {
          if (refreshDataBtn) refreshDataBtn.classList.remove("spinning");
        }, 500);
      });
  }

  /**
   * Show Toast Notification
   */
  function showToast(message, isError = false) {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "toast";
    if (isError) toast.style.borderColor = "var(--accent-red)";
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  /**
   * Utility to escape HTML
   */
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Utility to extract initials from name
   */
  function getInitials(name) {
    if (!name) return "CP";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // Start when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
