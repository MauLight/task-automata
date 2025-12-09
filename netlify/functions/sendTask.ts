export async function handler(event: any, context: any) {
    return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, msg: "Function works!" })
    };
}