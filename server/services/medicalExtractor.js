const OpenAI = require("openai");

const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY
});

async function extractMedicalInformation(text) {
    try {

        const response = await client.chat.completions.create({
            model: "inclusionai/ling-3.0-flash-sante:free",

            messages: [
                {
                    role: "system",
                    content: `
You are a medical document information extraction assistant.

Your job is to organize information from medical documents.

Do not provide medical advice.
Do not diagnose anything.
Do not invent information.

Only extract information explicitly present in the document.

Return ONLY valid JSON.

The JSON must have exactly these fields:

{
    "diagnoses": [],
    "symptoms": [],
    "medications": [],
    "tests": [],
    "procedures": [],
    "medical_history": [],
    "important_dates": [],
    "timeline_events": []
}

Each timeline event must have:

{
    "event_type": "",
    "title": "",
    "description": "",
    "event_date": ""
}

For timeline event dates:
- Use YYYY-MM-DD format.
- If the document contains a date such as 03/14/2006, convert it to 2006-03-14.
- Do not invent dates.
- If no exact date is available, do not create that timeline event.
                    `
                },

                {
                    role: "user",
                    content: `
Extract structured medical information from this document:

${text}
                    `
                }
            ],

            temperature: 0
        });

        return response.choices[0].message.content;

    } catch (error) {

        console.error("OpenRouter extraction error:", error);

        throw error;
    }
}
async function askMedicalRecords(question, medicalContext) {
    try {
        const response = await client.chat.completions.create({
            model: "inclusionai/ling-3.0-flash-sante:free",

            messages: [
                {
                    role: "system",
                    content: `
You are CareBridge, a medical records assistant.

Answer the user's question using ONLY the medical records provided.

Rules:
- Do not invent information.
- Do not provide medical advice.
- Do not diagnose the patient.
- Keep the answer simple and clear.
- If the information is not present, say:
  "I could not find that information in your records."
- Return ONLY the answer in normal text.
                    `
                },
                {
                    role: "user",
                    content: `
Medical records:

${medicalContext}

Question:

${question}
                    `
                }
            ],

            temperature: 0
        });

        return response.choices[0].message.content;

    } catch (error) {
        console.error("Ask records AI error:", error);
        throw error;
    }
}

async function askMedicalRecords(question, medicalContext) {
    try {
        const response = await client.chat.completions.create({
            model: "inclusionai/ling-3.0-flash-sante:free",

            messages: [
                {
                    role: "system",
                    content: `
You are CareBridge, a medical records assistant.

Answer the user's question using ONLY the medical records provided.

Rules:
- Do not invent information.
- Do not provide medical advice.
- Do not diagnose the patient.
- Keep the answer simple and clear.
- If the information is not present, say:
"I could not find that information in your records."
- Return ONLY the answer in normal text.
`
                },
                {
                    role: "user",
                    content: `
Medical records:

${medicalContext}

Question:

${question}
`
                }
            ],

            temperature: 0
        });

        return response.choices[0].message.content;

    } catch (error) {
        console.error("Ask records AI error:", error);
        throw error;
    }
}

module.exports = {
    extractMedicalInformation,
    askMedicalRecords
};