require("dotenv").config();
const { Bot, webhookCallback } = require("grammy");
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
    .reply("*Welcome!* ✨ Send the name of a celebrity.", {
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
            console.log("User exists in database.", ctx.from.id);
          }
        }
      );
    })
    .catch((error) => console.error(error));
});

bot.command("help", async (ctx) => {
  await ctx
    .reply(
      "*@anzubo Project.*\n\nThis bot uses the WikiFeet website.\n_You are required to follow WikiFeet's TOS._",
      { parse_mode: "Markdown" }
    )
    .then(() => console.log("Help command message sent."))
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
    await ctx.reply("Searching for " + name);

    let searchResults = await wikifeet.search(ctx.msg.text);
    if (searchResults.length === 0) {
      console.log("No results found for:", ctx.msg.text);
      await ctx.reply("No results found for " + name);
      return;
    } else {
      let query = searchResults[0];
      let pics = await wikifeet.getImages(query);

      var index = [];
      for (let i = 0; i < 3; i++) {
        if (i >= pics.length) {
          console.error("Not enough pics for:", name);
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
    await ctx.reply("Query: " + ctx.msg.text + " not found!");
    console.error(error);
    return;
  }
});

// Function

export default webhookCallback(bot, "http");
