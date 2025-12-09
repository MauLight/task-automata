import { GraphQLClient } from "graphql-request"

export const monday = new GraphQLClient("https://api.monday.com/v2", {
    headers: {
        Authorization: import.meta.env.VITE_MONDAY_TOKEN
    }
})