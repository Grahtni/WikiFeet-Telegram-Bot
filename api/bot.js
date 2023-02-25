require("dotenv").config();
const { Bot, webhookCallback, HttpError, GrammyError } = require("grammy");
const wikifeet = require("wikifeet-js");

// Bot

const bot = new Bot(process.env.BOT_TOKEN);

// DB

const mysql = require("mysql2");
const connection = mysql.createConnection(process.env.DATABASE_URL);

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
  await ctx
    .reply("*Welcome!* ✨\n_Send the name of a celebrity._", {
      parse_mode: "Markdown",
    })
    .then(() => {
      connection.query(
        `
SELECT * FROM users WHERE userid = ?
`,
        [ctx.from.id],
        (error, results) => {
          if (error) throw error;
          if (results.length === 0) {
            connection.query(
              `
    INSERT INTO users (userid, username, firstName, lastName, firstSeen)
    VALUES (?, ?, ?, ?, NOW())
  `,
              [
                ctx.from.id,
                ctx.from.username,
                ctx.from.first_name,
                ctx.from.last_name,
              ],
              (error, results) => {
                if (error) throw error;
                console.log("New user added:", ctx.from);
              }
            );
          } else {
            console.log("User exists in database.", ctx.from);
          }
        }
      );
    })
    .catch((error) => console.error(error));
});

bot.command("help", async (ctx) => {
  await ctx
    .reply(
      "*@anzubo Project.*\n\n_This bot uses the WikiFeet website.\nSend the name of a celebrity to try it out!_",
      { parse_mode: "Markdown" }
    )
    .then(() => console.log("Help command message sent to", ctx.from.id))
    .catch((error) => console.error(error));
});

// Messages

bot.on("msg", async (ctx) => {
  // Logging

  if (ctx.from.last_name === undefined) {
    console.log(
      "From:",
      ctx.from.first_name,
      "(@" + ctx.from.username + ")",
      "ID:",
      ctx.from.id
    );
  } else {
    console.log(
      "From:",
      ctx.from.first_name,
      ctx.from.last_name,
      "(@" + ctx.from.username + ")",
      "ID:",
      ctx.from.id
    );
  }
  console.log("Message:", ctx.msg.text);

  // Logic

  try {
    let name = ctx.msg.text
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    await ctx.reply(`*Searching for ${name}*`, { parse_mode: "Markdown" });
    async function searchWikifeet(name) {
      const searchResults = await wikifeet.search(name);
      console.log(`${searchResults.length} pics found for ${name}`);
      return searchResults;
    }
    let results = await searchWikifeet(ctx.msg.text);
    if (results.length === 0) {
      console.log("No results found for:", ctx.msg.text);
      await ctx.reply("No results found for " + name);
      return;
    } else {
      let query = results[0];
      let pics = await wikifeet.getImages(query);
      var index = [];
      for (let i = 0; i < 3; i++) {
        if (i >= pics.length) {
          console.error("Not enough pics for:", name);
          await ctx.reply(`Not enough pics for ${name}`);
          return;
        }
        let random = 0 | (pics.length * Math.random());
        index.push(random);
      }
      for (let i = 0; i < index.length; i++) {
        await ctx.replyWithPhoto(pics[index[i]]);
      }
    }
  } catch (error) {
    if (error instanceof GrammyError) {
      console.log(`Error sending message${error.message}`);
      return;
    } else {
      console.log("An error occurred");
      await ctx.reply(`Query ${name} not found!`, {
        parse_mode: "Markdown",
        reply_to_message_id: ctx.msg.message_id,
      });
      return;
    }
  }
});

// Error

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(
    "Error while handling update",
    ctx.update.update_id,
    "\nQuery:",
    ctx.msg.text
  );
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("Error in request:", e.description);
    if (e.description === "Forbidden: bot was blocked by the user") {
      console.log("Bot was blocked by the user");
    } else {
      ctx.reply("An error occurred");
    }
  } else if (e instanceof HttpError) {
    console.error("Could not contact Telegram:", e);
  } else {
    console.error("Unknown error:", e);
  }
});

// Run

export default webhookCallback(bot, "http");
