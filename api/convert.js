const STYLE_PROMPTS = {
  "적당한 존댓말": "다음 텍스트를 자연스럽고 적당한 존댓말로 바꿔줘. 너무 딱딱하지 않게, 일상적인 정중함을 유지해줘.",
  "엄격 격식체": "다음 텍스트를 공식 문서나 이메일에 어울리는 엄격한 격식체로 바꿔줘. 경어를 정확히 사용하고 어미를 '-습니다', '-입니다'로 통일해줘.",
  "사내 메시지": "다음 텍스트를 직장 내 메신저에서 쓰기 적합한 말투로 바꿔줘. 간결하고 예의 바르되 너무 딱딱하지 않게 해줘.",
  "고객 응대": "다음 텍스트를 고객 응대에 어울리는 친절하고 정중한 말투로 바꿔줘. 고객이 편안함을 느낄 수 있도록 해줘.",
  "학부모 안내": "다음 텍스트를 학교나 학원에서 학부모에게 보내는 공지 말투로 바꿔줘. 정중하고 신뢰감 있게 해줘.",
  "소개팅": "다음 텍스트를 소개팅 상대에게 보내기 적합한 말투로 바꿔줘. 자연스럽고 호감 가며 밝은 느낌으로 해줘.",
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { text, style } = req.body;
  if (!text || !style) return res.status(400).json({ error: "텍스트와 말투를 입력해주세요." });

  const systemPrompt = STYLE_PROMPTS[style] ?? "다음 텍스트를 자연스러운 한국어로 바꿔줘.";

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
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
    return res.status(200).json({ result });
  } catch (e) {
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
}
