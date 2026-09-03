import seedPayload from '../../demo-seed.json';

export default {
  async fetch(request, env, ctx) {
    return new Response("RANT Demo Cron Worker is active. It runs automatically in the background.");
  },
  
  async scheduled(event, env, ctx) {
    if (env.TARGET_URL === "https://your-demo-url.pages.dev/api/demo/reset") {
      console.log("Please set your TARGET_URL in wrangler.toml");
      return;
    }

    const response = await fetch(env.TARGET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.CRON_SECRET}`
      },
      body: JSON.stringify(seedPayload)
    });

    if (!response.ok) {
      console.error(`Failed to reset: ${response.status} ${await response.text()}`);
    } else {
      console.log("Demo reset successful!");
    }
  }
}
