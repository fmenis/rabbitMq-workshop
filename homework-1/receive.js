#!/usr/bin/env node

const amqplib = require("amqplib");

function sleep(ms) {
  return new Promise((resolve, _) => {
    setTimeout(function () {
      resolve();
    }, ms);
  });
}

async function main() {
  try {
    const connection = await amqplib.connect("amqp://localhost");
    const channel = await connection.createChannel();

    const queue = "q1";

    await channel.consume(queue, (msg) => console.log(msg.content.toString()));
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}

main();
