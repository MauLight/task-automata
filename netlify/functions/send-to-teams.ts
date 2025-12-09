import { GoogleGenAI } from '@google/genai';
import { taskPrompt } from '../../src/common/prompt'
import axios from 'axios';

export async function handler(event: any, context: any) {
    try {
        if (event.httpMethod !== 'POST') {
            return {
                statusCode: 405,
                body: JSON.stringify({ error: 'Only POST allowed' })
            };
        }

        const { text, userId, username, sprint, groupId } = JSON.parse(event.body || '{}');

        if (!text) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing text field' })
            };
        }

        /** -------------------------
         * 1) GENERATE using Gemini
         * ------------------------ */
        const prompt = taskPrompt.replace("{USER_INPUT}", text);

        const ai = new GoogleGenAI({ apiKey: 'AIzaSyC-G8UYaa8OQ2NIHQbi_7KSSkgxb4Ues7g' });

        const res = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        let enrichedText: string = (res.text ?? "").toString();
        console.log("Gemini output:", enrichedText);

        enrichedText = enrichedText
            .replace(/```json/i, "")
            .replace(/```/g, "")
            .trim();

        console.log("Gemini output2:", enrichedText);
        // Gemini output MUST be valid JSON
        let taskJson
        try {
            taskJson = JSON.parse(enrichedText as string);
        } catch (e) {
            console.error("Invalid JSON from Gemini:", enrichedText);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: "Gemini returned invalid JSON",
                    raw: enrichedText
                })
            };
        }

        const { type, description, priority } = taskJson

        /** --------------------------
         * 2) CREATE ITEM IN MONDAY
         * ------------------------- */


        const PRIORITY_MAP = {
            low: "Low",
            medium: "Medium",
            high: "High"
        };

        // Ensure priorityKey is typed as one of PRIORITY_MAP's keys to allow safe indexing
        const priorityKey: keyof typeof PRIORITY_MAP =
            (typeof priority === "string" ? priority.toLowerCase() as keyof typeof PRIORITY_MAP : "low")

        const priorityLabel = PRIORITY_MAP[priorityKey] || "Low"
        const boardId = 9137787182

        const itemName = `${type}: ${description}`

        const mondayMutation = `
            mutation ($boardId: ID!, $groupId: String!, $itemName: String!, $cols: JSON!) {
                create_item (
                    board_id: $boardId,
                    group_id: $groupId,
                    item_name: $itemName,
                    column_values: $cols
                ) {
                    id
                    name
                }
            }
        `

        const APItoken = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjU5NDY0NTU5NiwiYWFpIjoxMSwidWlkIjo3NTk1OTc5MywiaWFkIjoiMjAyNS0xMi0wN1QwNToxNzoxNC4yNTJaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MTcxNjUzNTUsInJnbiI6InVzZTEifQ.wMPDpwQrTuH-WJo59c6LgRb16qPqHLx_DhygwDwwK4o'

        const mondayVars = {
            boardId,
            groupId,
            itemName,
            cols: JSON.stringify({
                status: { label: "Sprint" },

                // NEW PRIORITY (corrected column id)
                color_mkr0gap6: { label: priorityLabel },

                // CREATED DATE
                date4: { date: new Date().toISOString().split("T")[0] },

                board_relation_mks6vh7p: {
                    item_ids: [sprint]
                },

                // OWNER (people column)
                person: {
                    personsAndTeams: [
                        {
                            id: userId,
                            kind: "person"
                        }
                    ]
                }
            })
        };

        const mondayRes = await axios.post(
            "https://api.monday.com/v2",
            { query: mondayMutation, variables: mondayVars },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: APItoken
                }
            }
        );

        console.log("Monday response:", mondayRes.data);
        const createdItemId = mondayRes.data.data.create_item.id;

        /** --------------------------
         * 3) SEND TO TEAMS CHANNEL
         * ------------------------- */
        const webHookURL = 'https://e4ccnet.webhook.office.com/webhookb2/6ec4d1dc-0c13-4ffc-8392-e69dce9784d9@1ee78858-bd52-403d-a5ca-01bba9b9377e/IncomingWebhook/7707a449c97346659537c22448c85e59/fe2022b8-ff2a-44bd-bff2-7e657a642f56/V23ykMVedda32U93S6gp0Rkh8s9iMxQ5F5avRu8oWqZwg1'

        if (!webHookURL) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Teams WebhookURL not configured' })
            };
        }

        const teamsRes = await fetch(webHookURL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: `New task created in Monday:\n\n${itemName}\n\nUser: ${username}\n\nPriority: ${taskJson.priority}\n\nItem ID: ${createdItemId}`
            })
        });

        if (!teamsRes.ok) {
            const details = await teamsRes.text();
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: "Failed to send to Teams",
                    details
                })
            };
        }

        /** --------------------------
         * FINISHED
         * ------------------------- */
        return {
            statusCode: 200,
            body: JSON.stringify({
                ok: true,
                createdItemId,
                sentToTeams: true,
                enrichedText
            })
        };

    } catch (err: any) {
        console.error("Error:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message || String(err) })
        };
    }
}
