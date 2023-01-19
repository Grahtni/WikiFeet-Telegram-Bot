require('dotenv').config();
const { Bot, session, GrammyError, HttpError } = require("grammy");
const { run, sequentialize } = require("@grammyjs/runner");
const wikifeet = require('wikifeet-js');
let BOT_DEVELOPER = 0 | (process.env.BOT_DEVELOPER);

// Bot
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
  console.log(`Response time: ${after - before} ms`); }

bot.use(responseTime);

// Admin

bot.use(async (ctx, next) => {
  ctx.config = {
    botDeveloper: BOT_DEVELOPER,
    isDeveloper: ctx.from?.id === BOT_DEVELOPER,
  };
  await next();
});

// Commands

bot.command("start", async (ctx) => {
    if (ctx.config.isDeveloper) {
      await ctx.reply("*Greetings father!*", { parse_mode: "Markdown" } ); }
    else {
      await ctx.reply("*Welcome!* ✨ Send the name of a celebrity.", { parse_mode: "Markdown" } );
      if (ctx.from.last_name === undefined) {
        await bot.api.sendMessage(ctx.config.botDeveloper, "New user: " + ctx.from.first_name + ' (@' + ctx.from.username + ') ' + ' ID: ' + ctx.from.id); }
      else {
        await bot.api.sendMessage(ctx.config.botDeveloper, "New user: " + ctx.from.first_name + " " + ctx.from.last_name + ' (@' + ctx.from.username + ') ' + ' ID: ' + ctx.from.id); }
      console.log("New user added:", "\n", ctx.from); }
    });
bot.command("help", (ctx) => ctx.reply("*@anzubo Project.*\n\nThis bot uses the WikiFeet website. You are required to follow WikiFeet's TOS. With usage of the bot service you take full responsibility of content downloaded. You will not download anything of an illegal and/or adult nature.", { parse_mode: "Markdown" } ));

// Messages

bot
  .on("msg", async (ctx) => {
    // Console
    if (ctx.config.isDeveloper) {}
    else {
      if (ctx.from.last_name === undefined) {
        console.log('from:', ctx.from.first_name, '(@' + ctx.from.username + ')', 'ID:', ctx.from.id); 
        await bot.api.sendMessage(ctx.config.botDeveloper, 'From: ' + ctx.from.first_name + ' (@' + ctx.from.username + ') ' + ' ID: ' + ctx.from.id); }
      else {
        console.log('from:', ctx.from.first_name, ctx.from.last_name, '(@' + ctx.from.username + ')', 'ID:', ctx.from.id);
        await bot.api.sendMessage(ctx.config.botDeveloper, 'From: ' + ctx.from.first_name + " " + ctx.from.last_name + ' (@' + ctx.from.username + ') ' + ' ID: ' + ctx.from.id); }
      }
    if (ctx.config.isDeveloper) {}
    else { await bot.api.sendMessage(ctx.config.botDeveloper, 'Message:  ' + ctx.msg.text); }
    console.log("Message:", ctx.msg.text);
    // Logic
    let name = (ctx.msg.text.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') );
    const statusMessage = await ctx.reply ("Searching for " + name );
    let query = (await wikifeet.search(ctx.msg.text))[0];
    if (query === null) { return console.log("Query:", ctx.msg.text, "not found!"); }
    else {
        let pics = await wikifeet.getImages(query);
        //let random = 0 | (pics.length * Math.random());
        var index = [];
        for (let i = 0; i < 5; i++) {
          let random = 0 | (pics.length * Math.random());
          index.push(random); }
        for (let i = 0; i < index.length; i++) {
          await ctx.replyWithPhoto(pics[index[i]]); }
          setTimeout(async () => {
            await ctx.api.deleteMessage(ctx.chat.id, statusMessage.message_id).catch( () => {} ); }, 5000);
      }});

// Error Handling

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  console.error("Details:");
  console.error("Query:", ctx.msg.text, "not found!");
  ctx.reply("Query: " + ctx.msg.text + " " + "not found!");
  bot.api.sendMessage(ctx.config.botDeveloper, "Query: " + ctx.msg.text + " " + "not found!");
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
run(bot);