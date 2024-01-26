#! /usr/bin/env node
import chalk from 'chalk';
import inquirer from 'inquirer';
import gradient from 'gradient-string';
import chalkAnimation from 'chalk-animation';
import figlet from 'figlet';
import { createSpinner } from 'nanospinner';
import 'dotenv/config';
import { MongoClient } from 'mongodb';

// Replace the uri string with your connection string.
const uri = process.env.URI;

const client = new MongoClient(uri);

let timerStatus;
// todos -- DONE implement a way to have pause/resume added to the options menu dynamically
// -------- DONE design database
// -------- DONE connect to mongodb atlas
// -------- combine fetchstatus and fetch current time - current layout is dumb
// -------- implement returning from async functions
// -------- must make a way to make an entry retroactively
// optional
// -------- make a random sign off function for cute factor
// -------- copy punchcard to clipboard


// timer status : not running / current elapsed time - X:XX
// current weekly time: X:XX
// ------
// options:
// => start time / stop time (dynamically changed based on what's happening)
//     => if start time -> auto exits
//     => if stop time
//         => erase time - has a 'do you really want to delete screen'
//         => add a note - adds a note
//         => add a tag - adds a tag  
//         => save & exit
// => see log
//     => shows total, weekly time, current time - then one month's worth of logs
//     => show +1 month
//     => show all
//     => exit
// => Set API key
// => help
// => exit

async function mainMenu() {
    console.log('Welcome to timekeeper, where we keep time.');
    console.log(chalk.cyanBright('------------------------------------------'))

    let currentWeeklyTime = fetchCurrentWeeklyTime();

    let currentTime = await fetchCurrentSession();

    if(timerStatus == 'running'){
        console.log(`The current elapsed time is - ${chalk.greenBright(currentTime)} minutes`);

    } else if (timerStatus == 'paused'){
        console.log(`The timer is ${chalk.greenBright('paused')} at - ${chalk.greenBright(currentTime)} minutes`);

    } else {
        console.log(chalk.redBright('!!!'), chalk.italic.cyanBright('there is no timer currently running'));
    }   

    console.log(`The current weekly time is - ${chalk.greenBright(currentWeeklyTime)}`);
}

async function mainPrompt() {
    let startOrStop = '';
    let mainPromptChoices = [];
    let secondHalfChoices = ['print log', 'help', 'exit'];

    if(timerStatus == 'running'){
        mainPromptChoices = ['stop timer', 'pause timer'];
    } else if (timerStatus == 'paused'){
        mainPromptChoices = ['resume timer', 'stop timer'];
    } else {
        mainPromptChoices = ['start timer']
    }

    mainPromptChoices = mainPromptChoices.concat(secondHalfChoices);

    const answers = await inquirer.prompt({
        name: 'main_prompt_selection',
        type: 'list',
        message: 'please select an option',
        choices: mainPromptChoices
    });

    handleMainPrompt(answers.main_prompt_selection);
}

async function handleMainPrompt(choice){
    if (choice == 'start timer'){
        await startTimer();

    } else if (choice == 'resume timer'){
        await resumeTimer();

    } else if (choice == 'stop timer'){
        await stopAndExit();

    } else if (choice == 'pause timer'){
        await pauseTimer();

    } else if (choice == 'print log'){
        console.log('printed log');
    } else if (choice == 'help'){
        console.log('you don\'t need help')
    } else if (choice == 'exit'){
        console.log(chalk.greenBright('goodbye'));
        process.exit(1);
    } else {
        console.log(chalk.redBright('An error has occured, press F to pay respects'));
        process.exit(1);
    }
}


// create fetch functions
async function fetchCurrentSession(){
    // do things with database
    // timerStatus options -> running, not running, paused
    try {
        await client.connect();
        const database = client.db('timekeeperdb');
        const punches = database.collection('timekeepercollection');
    
        const query = { status: 'paused' };
        const altQuery = {status: 'running'};
        let paused = await punches.findOne(query);
        let running = await punches.findOne(altQuery);

        const now = new Date();
        console.log(now);
        console.log(now.getTime());

        let currentTimer;
        
        if(paused == null && running == null){
            timerStatus = 'not running'
        } else if (paused == null && running != null){
            timerStatus = 'running';
            let now = new Date();
            console.log(running.punches[0].punch_in);
            let time = getStringFromMinutes(getTimeSinceTimestamp(running.punches[0].punch_in, now));
            currentTimer = time;
        } else if (paused != null && running == null){
            timerStatus = 'paused';
            let time = getStringFromMinutes(getSumOfPunchesArray(paused.punches));
            currentTimer = time;
        } else {
            console.log('error connecting to network, please try again')
            process.exit(1);
        }

        return currentTimer;
        
      } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
      }
} 

function fetchCurrentWeeklyTime(){
    return "8:32";
}

function fetchCurrentTime(){
    return "1:42";
}

// interact with timer
async function startTimer(){
    // make a little function for random sign offs - time started, carpe codex || time started, once more unto the breach!

    try {
        // Connect to the "insertDB" database and access its "haiku" collection
        await client.connect();
        const database = client.db('timekeeperdb');
        const punches = database.collection('timekeepercollection');

        // Create a document to insert
        const doc = {
          status: "running",
          punches: [
            {
                "punch_in": new Date()
            }
          ],
          total_time_minutes: 0,
          tags: null,
          notes: null
        }
        // Insert the defined document into the "haiku" collection
        const result = await punches.insertOne(doc);
        // Print the ID of the inserted document
        console.log(`A document was inserted with the _id: ${result.insertedId}`);
        console.log(chalk.green('Timer started, happy coding'));
      } catch (error){
        console.error(error);
        console.log(chalk.red('An error has ocurred, please try again \n'));
        mainPrompt();

      } finally {
         // Close the MongoDB client connection
        await client.close();
      }
}

async function resumeTimer(){
    console.log('resume mode');
    await startTimer();
}

async function pauseTimer(){
    // database things
    console.log('timer paused')
}

async function stopAndExit(){
    // I dislike how much you have to enter in things with the confirm - but may be useful
    
    // const answers = await inquirer.prompt({
    //     name: 'confirm',
    //     type: 'list',
    //     message: 'are you sure you want to stop and exit?',
    //     choices: [
    //     'yes',
    //     'return to main menu'
    //     ],
    // });

    // if(answers.confirm == 'return to main menu'){
    //     await mainMenu();
    //     await mainPrompt();
    // }

    const tagsArray = ['Just Coding', 'Networking', 'In Class'];
    const tagAnswers = await inquirer.prompt({
        name: 'tag_selection',
        type: 'checkbox',
        message: 'please select any relevant tags: ',
        choices: tagsArray,
    });
    
    let tagOutput = tagAnswers.tag_selection;

    const isNoted = await inquirer.prompt({
        name: 'is_noted_selection',
        type: 'confirm',
        message: 'would you like to include a note?'
    });

    let notes;

    if(isNoted.is_noted_selection){
        await inquirer.prompt([
            {
                name: 'notes_taken',
                type: 'input',
                message: 'enter your notes:'
            }
        ])
        .then((answer => {
            notes = answer.notes_taken;
        }))
    }

    // send current time, tags, notes to database
    const isError = false;
    if (!isError){
        console.log(`- Successfully connected to database - \nyour coding time today was X:XX\nyour total this week is XX:XX`);
    } else {
        console.log('error submitting to database :(');
    }

}
// parse data functions
function getTimeSinceTimestamp(date1, date2){
    date1 = new Date(date1);
    date2 = new Date(date2);
    let diff = (date2.getTime() - date1.getTime()) / 60000;
    diff = Math.abs(Math.round(diff));
    return diff;

}

function getSumOfPunchesArray(arr){
    let total = 0;

    for(let punchGroup in arr){
        total += getTimeSinceTimestamp(punchGroup.punch_in, punchGroup.punch_out)
    }
    return total;
}

function getStringFromMinutes(minutes){
    let hours = Math.floor(minutes / 60);
    minutes = minutes % 60;
    return `${hours}:${minutes}`;
}


// Run it with top-level await
console.clear();

await mainMenu();
// await askName();
await mainPrompt();

// fun mongodb things here

// example of how to return from an async function here
// async function handleRun(){
//     const entry = await fetchCurrentSession();
//     console.log("this is the entry");
//     console.log(entry);

// }

// await fetchCurrentSession();



async function findAll() {
    try{
        await client.connect();
        const database = client.db('timekeeperdb');
        const punches = database.collection('timekeepercollection');

        const allEntries = await punches.find();

        for await (const doc of allEntries){
            console.log(doc);
        }

    } finally {
        await client.close();
    }
}

// await findAll().catch(console.dir);