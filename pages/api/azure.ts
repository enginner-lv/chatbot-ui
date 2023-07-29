import {
  AZURE_DEPLOYMENT_ID,
  OPENAI_API_HOST,
  OPENAI_API_VERSION,
} from '@/utils/app/const';
import { OpenAIError } from '@/utils/server';

import { ChatBody } from '@/types/chat';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request) => {
  try {
    const body = (await req.json()) as ChatBody;

    const url = `${OPENAI_API_HOST}/openai/deployments/${AZURE_DEPLOYMENT_ID}/chat/completions?api-version=${OPENAI_API_VERSION}`;
    // const url = `https://west-europe-01.openai.azure.com/openai/deployments/test01/chat/completions?api-version=2023-05-15`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'api-key': `${body.key ? body.key : process.env.OPENAI_API_KEY}`,
      },
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (body.stream) {
      const reader = response?.body?.getReader();
      const stream = new ReadableStream({
        start(controller) {
          function push() {
            reader
              ?.read()
              .then(({ done, value }) => {
                if (done) {
                  controller.close();
                  return;
                }
                controller.enqueue(value);
                push();
              })
              .catch((error) => {
                console.error(error);
                controller.error(error);
              });
          }
          push();
        },
      });
      return new Response(stream);
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error) {
    console.error('error', error);
    if (error instanceof OpenAIError) {
      return new Response('Error', { status: 500, statusText: error.message });
    } else {
      return new Response('Error', {
        status: 500,
        statusText: error as string,
      });
    }
  }
};

export default handler;
