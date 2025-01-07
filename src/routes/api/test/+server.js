/** @type {import('./$types').RequestHandler} */
export async function GET({ platform }) {
  const input = { prompt: "What is the square root of 9?" };

  const answer = await platform.env.AI.run(
    "@cf/meta/llama-3.1-8b-instruct",
    input,
  );

  return new Response(JSON.stringify(answer));
}
