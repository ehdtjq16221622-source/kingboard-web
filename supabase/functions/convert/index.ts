import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STYLE_PROMPTS: Record<string, string> = {
  "적당한 존댓말":
    "다음 텍스트를 자연스럽고 적당한 존댓말로 바꿔줘. 너무 딱딱하지 않게, 일상적인 정중함을 유지해줘.",
  "엄격 격식체":
    "다음 텍스트를 공식 문서나 이메일에 어울리는 엄격한 격식체로 바꿔줘. 경어를 정확히 사용하고 어미를 '-습니다', '-입니다'로 통일해줘.",
  "사내 메시지":
    "다음 텍스트를 직장 내 메신저에서 쓰기 적합한 말투로 바꿔줘. 간결하고 예의 바르되 너무 딱딱하지 않게 해줘.",
  "고객 응대":
    "다음 텍스트를 고객 응대에 어울리는 친절하고 정중한 말투로 바꿔줘. 고객이 편안함을 느낄 수 있도록 해줘.",
  "학부모 안내":
    "다음 텍스트를 학교나 학원에서 학부모에게 보내는 공지 말투로 바꿔줘. 정중하고 신뢰감 있게 해줘.",
  "소개팅":
    "다음 텍스트를 소개팅 상대에게 보내기 적합한 말투로 바꿔줘. 자연스럽고 호감 가며 밝은 느낌으로 해줘.",
};

// IP별 요청 횟수 추적 (메모리, 서버 재시작 시 초기화)
const rateLimitMap = new Map<string, { count: number; date: string }>();
const DAILY_LIMIT = 10;

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function checkRateLimit(ip: string): boolean {
  const today = getToday();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.date !== today) {
    rateLimitMap.set(ip, { count: 1, date: today });
    return true;
  }
  if (entry.count >= DAILY_LIMIT) return false;
  entry.count++;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({
        error: "daily_limit",
        message: "하루 무료 변환 횟수(10회)를 초과했습니다.",
      }),
      {
        status: 429,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const { text, style } = await req.json();

    if (!text || !style) {
      return new Response(
        JSON.stringify({ error: "텍스트와 말투를 입력해주세요." }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    const systemPrompt =
      STYLE_PROMPTS[style] ??
      "다음 텍스트를 자연스러운 한국어로 바꿔줘.";

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt + "\n원문만 변환하고 설명은 하지 마. 변환된 텍스트만 출력해." },
          { role: "user", content: text },
        ],
      }),
    });

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ result }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "서버 오류가 발생했습니다." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
