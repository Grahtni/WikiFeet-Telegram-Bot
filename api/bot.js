require('dotenv').config();
const { Bot, webhookCallback } = require("grammy");
const wikifeet = require('wikifeet-js');

// Bot

const bot = new Bot(process.env.BOT_TOKEN);

// Response

async function responseTime(ctx, next) {
  const before = Date.now();
  await next();
  const after = Date.now();
  console.log(`Response time: ${after - before} ms`);
}

bot.use(responseTime);

// Commands

bot.command("start", async (ctx) => {
  await ctx.reply("*Welcome!* ✨ Send the name of a celebrity.", { parse_mode: "Markdown" })
    .then(() => console.log("New user added:", ctx.from))
    .catch((error) => console.error(error));
  });
bot.command("help", async (ctx) => {
  await ctx.reply("*@anzubo Project.*\n\nThis bot uses the WikiFeet website. You are required to follow WikiFeet's TOS.\nWith usage of the bot service you take full responsibility of content downloaded.\n_You will not download anything of an illegal and/or adult nature._", { parse_mode: "Markdown" } )
    .catch((error) => console.error(error));
  });

// Messages

bot.on("msg", async (ctx) => {

  // Logging

  if (ctx.from.last_name === undefined) {
    console.log('From:', ctx.from.first_name, '(@' + ctx.from.username + ')', 'ID:', ctx.from.id); }
  else { console.log('From:', ctx.from.first_name, ctx.from.last_name, '(@' + ctx.from.username + ')', 'ID:', ctx.from.id); }
  console.log("Message:", ctx.msg.text);

  // Logic
    
  try {
    let name = (ctx.msg.text.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') );
    await ctx.reply ("Searching for " + name );
    let query = (await wikifeet.search(ctx.msg.text))[0];
    if (query === null) { return console.log("Query:", ctx.msg.text, "not found!"); }    
    let pics = await wikifeet.getImages(query);
    var index = [];
    for (let i = 0; i < 5; i++) {
      let random = 0 | (pics.length * Math.random());
      index.push(random); }
      for (let i = 0; i < index.length; i++) {
        await ctx.replyWithPhoto(pics[index[i]]); 
    }
  } catch (error) {
    await ctx.reply ("Query: " + ctx.msg.text + " not found!");
    console.error(error);
    return;
  }

  });

  // Function

export default webhookCallback(bot, 'http');