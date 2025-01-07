import { json } from '@sveltejs/kit';

export const POST = async ({ platform, request }) => {
  const { prompt } = await request.json();

  const response = await platform.env.AI.run(
    "@cf/meta/llama-3.1-8b-instruct",
    { prompt },
  );

  return json(response, { status: 200 });
}
