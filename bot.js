require('dotenv').config();
const { Bot, session, GrammyError, HttpError } = require("grammy");
const { run, sequentialize } = require("@grammyjs/runner");
const wikifeet = require('wikifeet-js');

// Create a bot.
const bot = new Bot(process.env.BOT_TOKEN);

// Build a unique identifier for the `Context` object.
function getSessionKey(ctx) {
  return ctx.chat?.id.toString();
}

// Sequentialize before accessing session data.
bot.use(sequentialize(getSessionKey));
bot.use(session({ getSessionKey }));

// Measure response time

async function responseTime(ctx, next) {
  // take time before
  const before = Date.now(); // milliseconds
  // invoke downstream middleware
  await next(); // make sure to `await`!
  // take time after
  const after = Date.now(); // milliseconds
  // log difference
  console.log(`Response time: ${after - before} ms`);
}

bot.use(responseTime);

// Commands

// Developer customized command logic (optional)

/*
bot.command("start", async (ctx) => {
    //if (ctx.config.isDeveloper) await ctx.reply("Welcome admin!");
    if (ctx.config.isDeveloper) await ctx.reply("Welcome admin!");
    else await (ctx.reply("<b>Welcome!</b> ✨ Send a webpage or article behind a paywall and we will remove it for you.", { parse_mode: "HTML" }),
      console.log("New user added:", ctx.from));
  });
*/

bot.command("start", (ctx) => {
    ctx.reply("<b>Welcome!</b> ✨ Send the name of a celebrity.",{ parse_mode: "HTML" } );
    console.log("New user added:");
    console.log(ctx.from);
    });
bot.command("help", (ctx) => ctx.reply("This bot uses the WikiFeet website. Both this bot and the site are free services hosted and operational on voluntary basis subject to shutdown at any point in time. You are required to follow WikiFeet's TOS. With usage of the bot service you take full responsibility of content downloaded subject to laws in your jurisdiction as well as the bot server host country (India). You will not download anything of an illegal and/or adult nature. Usage of the bot implies you accept and are bound by these terms."));

// Messages

bot
  .on("msg", async (ctx) => {
    // Console
    if (ctx.from.last_name === undefined) {
        //await bot.api.sendMessage (BOT_DEVELOPER, "From: " + ctx.from.first_name + " (@" + ctx.from.username + ") " + " ID: " + ctx.from.id);
        console.log('from:', ctx.from.first_name, '(@' + ctx.from.username + ')', 'ID:', ctx.from.id); }
        else {
        //await bot.api.sendMessage (BOT_DEVELOPER, "From: " + ctx.from.first_name + " " + ctx.from.last_name + " (@" + ctx.from.username + ") " + " ID: " + ctx.from.id);
        console.log('from:', ctx.from.first_name, ctx.from.last_name, '(@' + ctx.from.username + ')', 'ID:', ctx.from.id); }
    console.log("Message:", ctx.msg.text);
    // Logic
    let query = (await wikifeet.search(ctx.msg.text))[0];
    if (query === null) { return console.log("Query:", ctx.msg.text, "not found!"); }
    else {
        let pics = await wikifeet.getImages(query);
        //if (pics === null) { return console.log("Query:", ctx.msg.text, "not found!"); }
        let random = 0 | (pics.length * Math.random());
        //console.log("Link:", pics[random]);
        //console.log(pics);
        await ctx.replyWithPhoto (pics[random]);
        /*await ctx.reply(pics[random]);
        await ctx.reply(pics[random]);
        await ctx.reply(pics[random]);
        await ctx.reply(pics[random]); */ }
    });

// Error Handling

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  console.error("Details:");
  console.error("Query:", ctx.msg.text, "not found!");
  ctx.reply("Query: " + ctx.msg.text + " " + "not found!");
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("Error in request:", e.description);
  } else if (e instanceof HttpError) {
    console.error("Could not contact Telegram:", e);
  } else {
    console.error("Unknown error:", e);
  }
});

    // Run it concurrently

console.log('Bot running. Please keep this window open or use a startup manager like PM2 to setup persistent execution and store logs.');
// console.log('CTRL+C to terminate.')
run(bot);