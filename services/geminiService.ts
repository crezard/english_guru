import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

// Safely access process.env.API_KEY.
// This prevents "ReferenceError: process is not defined" in browser environments where the bundler
// hasn't replaced the variable, preventing the "white screen" crash.
const getApiKey = (): string => {
  try {
    // If the bundler replaces this string, it becomes "YOUR_KEY".
    // If not, it attempts to access the object.
    return process.env.API_KEY || "";
  } catch (e) {
    // Gracefully handle the case where 'process' is not defined
    return "";
  }
};

const apiKey = getApiKey();

if (!apiKey) {
  console.warn("API_KEY is missing. Chat functionality will likely fail.");
}

const ai = new GoogleGenAI({ apiKey: apiKey });

const SYSTEM_INSTRUCTION = `
당신은 영어를 배우는 사용자를 돕는 친절하고 유능한 'AI 영어 문법 선생님'입니다. 
사용자가 영어(또는 콩글리시)로 문장을 입력하면 다음의 과정을 따르세요:

1. **분석**: 사용자의 입력 문장에서 문법, 철자, 자연스러운 원어민 표현 등을 분석합니다.
2. **교정 및 설명**:
   - 오류가 있거나 더 자연스러운 표현이 필요하다면, "🔍 **Correction**: [수정된 영어 문장]" 형식으로 보여주고, 그 아래에 "💡 **Explanation**: [한국어로 된 간단하고 명확한 문법/표현 설명]"을 덧붙이세요.
   - 문장이 문법적으로 완벽하고 자연스럽다면, "✅ Perfect!"라고 짧게 칭찬해주세요.
3. **대화 지속**: 문법 피드백이 끝난 후, 사용자의 말에 **영어**로 자연스럽게 반응하며 대화를 이어가세요. 사용자가 영어를 더 많이 연습할 수 있도록 흥미로운 질문을 던져주세요.

톤앤매너: 
- 설명(Explanation)은 한국어로 친절하게 해주세요.
- 교정(Correction)과 대화(Conversation)는 영어로 진행하세요.
- 이모지를 적절히 사용하여 딱딱하지 않고 즐거운 분위기를 만들어주세요.
`;

let chatInstance: Chat | null = null;

export const initializeChat = (): Chat => {
  chatInstance = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    },
  });
  return chatInstance;
};

export const sendMessageStream = async (
  message: string,
  onChunk: (text: string) => void
): Promise<void> => {
  if (!apiKey) {
    throw new Error("API_KEY is missing. Please check your environment variables.");
  }

  if (!chatInstance) {
    initializeChat();
  }

  if (!chatInstance) {
    throw new Error("Chat instance could not be initialized.");
  }

  try {
    const result = await chatInstance.sendMessageStream({ message });
    
    for await (const chunk of result) {
      const c = chunk as GenerateContentResponse;
      if (c.text) {
        onChunk(c.text);
      }
    }
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    throw error;
  }
};