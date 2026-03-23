from openai import OpenAI
from app.config import OPENAI_API_KEY

client = OpenAI(api_key=OPENAI_API_KEY)


def generate_article_summary(content: str) -> str:
    prompt = f"""
Summarize the following article in 3 to 4 concise sentences.

Requirements:
- Focus on the key concepts
- Explain why they matter
- Avoid copying the article sentence by sentence
- Make the summary clear, compact, and natural
- Do not use bullet points

Article:
{content}
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "You are a helpful assistant that summarizes technical and professional articles for readers who want the main ideas quickly."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.2,
    )

    return response.choices[0].message.content.strip()