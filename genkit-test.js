// import the Genkit and Google AI plugin libraries
import { googleAI } from '@genkit-ai/googleai';
import { genkit } from 'genkit';

// configure a Genkit instance
const ai = genkit({
  plugins: [googleAI()],
});

const helloFlow = ai.defineFlow('helloFlow', async (name) => {
  // make a generation request
  const { text } = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    prompt: `Hello Gemini, my name is ${name}`,
  });
  console.log(text);
});

helloFlow('Chris');
