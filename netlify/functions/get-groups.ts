import { GraphQLClient } from "graphql-request";

export async function handler() {
    try {
        const MONDAY_TOKEN = process.env.MONDAY_TOKEN;
        if (!MONDAY_TOKEN) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Missing MONDAY_TOKEN env var" })
            };
        }

        const client = new GraphQLClient("https://api.monday.com/v2", {
            headers: {
                Authorization: MONDAY_TOKEN
            }
        });

        const query = `
      query {
        boards(ids: 9137787182) {
          id
          name
          groups {
            id
            title
            color
            position
          }
        }
      }
    `;

        const data = await client.request(query);

        return {
            statusCode: 200,
            body: JSON.stringify(data.boards[0].groups)
        };

    } catch (err) {
        console.error("get-groups error:", err);
        const message = err instanceof Error ? err.message : String(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: message })
        };
    }
}