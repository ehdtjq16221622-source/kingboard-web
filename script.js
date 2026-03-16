// ===== 상태 =====
let selectedStyle = "적당한 존댓말";
let usageCount = parseInt(localStorage.getItem("kb_usage_count") || "0");
let usageDate = localStorage.getItem("kb_usage_date") || "";
const DAILY_LIMIT = 10;

// ===== 초기화 =====
document.addEventListener("DOMContentLoaded", () => {
  resetUsageIfNewDay();
  updateUsageUI();
  bindEvents();
});

function resetUsageIfNewDay() {
  const today = new Date().toISOString().split("T")[0];
  if (usageDate !== today) {
    usageCount = 0;
    usageDate = today;
    localStorage.setItem("kb_usage_count", "0");
    localStorage.setItem("kb_usage_date", today);
  }
}

// ===== 이벤트 바인딩 =====
function bindEvents() {
  // 말투 칩 선택
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      selectedStyle = chip.dataset.style;
    });
  });

  // 사이드바 가이드 클릭 → 칩 선택
  document.querySelectorAll(".guide-item").forEach((item) => {
    item.addEventListener("click", () => {
      const target = item.dataset.target;
      document.querySelectorAll(".chip").forEach((c) => {
        c.classList.toggle("active", c.dataset.style === target);
      });
      selectedStyle = target;
      document.getElementById("converter").scrollIntoView({ behavior: "smooth" });
    });
  });

  // 글자 수 카운터
  const textarea = document.getElementById("inputText");
  textarea.addEventListener("input", () => {
    document.getElementById("charCount").textContent =
      `${textarea.value.length} / 500`;
  });

  // 변환 버튼
  document.getElementById("convertBtn").addEventListener("click", handleConvert);

  // 복사 버튼
  document.getElementById("copyBtn").addEventListener("click", handleCopy);

  // Enter 키 (Ctrl+Enter)
  textarea.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleConvert();
  });
}

// ===== 변환 처리 =====
async function handleConvert() {
  const text = document.getElementById("inputText").value.trim();
  if (!text) {
    showError("텍스트를 입력해주세요.", "입력 필요");
    return;
  }

  resetUsageIfNewDay();

  if (usageCount >= DAILY_LIMIT) {
    showError(
      "하루 무료 변환 횟수(10회)를 모두 사용했습니다.",
      "무료 횟수 초과",
      true
    );
    return;
  }

  setLoading(true);
  hideError();
  hideResult();

  try {
    const result = await callConvertAPI(text, selectedStyle);
    usageCount++;
    localStorage.setItem("kb_usage_count", String(usageCount));
    updateUsageUI();
    showResult(result, selectedStyle);
  } catch (err) {
    showError(err.message || "변환 중 오류가 발생했습니다.", "오류");
  } finally {
    setLoading(false);
  }
}

// ===== API 호출 =====
async function callConvertAPI(text, style) {
  const url = "/api/convert";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, style }),
  });

  const data = await res.json();

  if (res.status === 429 || data.error === "daily_limit") {
    throw new Error("하루 무료 변환 횟수(10회)를 모두 사용했습니다.");
  }
  if (!res.ok || data.error) {
    throw new Error(data.error || "서버 오류가 발생했습니다.");
  }
  if (!data.result) {
    throw new Error("변환 결과를 받지 못했습니다.");
  }

  return data.result;
}

// ===== 복사 =====
async function handleCopy() {
  const text = document.getElementById("resultText").textContent;
  if (!text) return;
  await navigator.clipboard.writeText(text);
  const btn = document.getElementById("copyBtn");
  btn.classList.add("copied");
  btn.querySelector("span").textContent = "복사됨!";
  setTimeout(() => {
    btn.classList.remove("copied");
    btn.querySelector("span").textContent = "복사";
  }, 1500);
}

// ===== UI 헬퍼 =====
function setLoading(on) {
  const btn = document.getElementById("convertBtn");
  const icon = document.getElementById("btnIcon");
  const txt = document.getElementById("btnText");
  btn.disabled = on;
  btn.classList.toggle("loading", on);
  icon.textContent = on ? "↻" : "✦";
  txt.textContent = on ? "변환 중..." : "변환하기";
}

function showResult(text, style) {
  document.getElementById("resultText").textContent = text;
  document.getElementById("styleBadge").textContent = style;
  document.getElementById("resultCard").style.display = "block";
  document.getElementById("resultCard").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideResult() {
  document.getElementById("resultCard").style.display = "none";
}

function showError(msg, title = "오류", showAppLink = false) {
  document.getElementById("errorTitle").textContent = title;
  const msgEl = document.getElementById("errorMsg");
  msgEl.textContent = msg;
  if (showAppLink) {
    const link = document.createElement("a");
    link.href = "#app-download";
    link.className = "error-app-link";
    link.textContent = "앱으로 무제한 사용하기 →";
    link.onclick = () => document.getElementById("app-download").scrollIntoView({ behavior: "smooth" });
    msgEl.appendChild(document.createElement("br"));
    msgEl.appendChild(link);
  }
  document.getElementById("errorCard").style.display = "flex";
}

function hideError() {
  document.getElementById("errorCard").style.display = "none";
}

function updateUsageUI() {
  const remaining = Math.max(0, DAILY_LIMIT - usageCount);
  const pct = (remaining / DAILY_LIMIT) * 100;
  document.getElementById("usageFill").style.width = `${pct}%`;
  document.getElementById("usageCount").textContent = `${remaining} / ${DAILY_LIMIT}`;
  if (remaining <= 3) {
    document.getElementById("usageFill").style.background = "#f29900";
  }
  if (remaining === 0) {
    document.getElementById("usageFill").style.background = "#d93025";
  }
}
