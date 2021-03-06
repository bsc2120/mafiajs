const { Death, Fact } = require("./server/db/models");
const db = require("./server/db/db");

const deaths = [
  {
    storyForAll:
      "should've gone for the caramel macchiato because the skinny latte was poisoned",
    storyForKilled:
      "should've gone for the caramel macchiato because the skinny latte was poisoned"
  },
  {
    storyForAll:
      "was found on the kitchen floor, covered in blood and chocolate cake",
    storyForKilled:
      "were found on the kitchen floor, covered in blood and chocolate cake"
  },
  {
    storyForAll:
      "was last seen ordering a coffee, but never came to pick it up",
    storyForKilled:
      "were last seen ordering a coffee, but never came to pick it up"
  },
  {
    storyForAll:
      "went into the salon for a simple hair cut but came out with their head cut off",
    storyForKilled:
      "went into the salon for a simple hair cut but came out with your head cut off"
  }
];

const mafiaFacts = [
  {
    fact:
      "A government analysis estimated that, in the 1960s, the illicit profit of the nation's twenty-odd mob families topped $7 billion annually, approximately the combined earnings of the ten largest industrial corporations in the country."
  },
  {
    fact:
      "Vincent Gigante was a Mafia boss who for 30 years wandered Greenwich Village of New York in his pajamas mumbling incoherently to himself, in an elaborate act to avoid prosecution. They called him 'The Oddfather' and 'The Enigma in the Bathrobe'"
  },
  {
    fact:
      "The filming of The Godfather was disrupted by actual Mafia member Joe Colombo (head of Colombo Crime Family). Producer Al Ruddy met with him and reviewed the script, striking the word “Mafia” completely from the movie. Colombo and his pals also managed to elbow their way into casting and ended up as extras in the film. "
  },
  {
    fact:
      "John 'Sonny' Franzese told mafia informant Guy Fatato, 'I killed a lot of guys...you`re not talking about four, five, six, ten.' Franzese instructed Fatano to wear hairnets when disposing of evidence, and said getting rid of a body could be done by 'dismembering the corpse in a kiddie pool and drying the severed body parts in a microwave before stuffing the parts in a commercial-grade garbage disposal.'"
  },
  {
    fact:
      "The alleged requirements to become 'made' – fully initiated – in a La Cosa Nostra family are that you're a full-blooded Italian on both sides – specifically Sicilian, if they're being strict - that you're sponsored by made members of that family, and that you commit a murder for the family. This is called 'making your bones.' The only other way to become made is through being an 'earner' – making large amounts of money for the family"
  },
  {
    fact:
      "When Viggo Mortensen was filming “Eastern Promises”, he kept his fake tattoos on one day when going to dinner at a Russian restaurant. According to the actor, when people saw the tattoos they fell silent, presuming he was a real member of the Russian mafia"
  },
  {
    fact:
      "Former Mafia associate Sal Polisi always used a white, plastic 'I LOVE NEW YORK' bag for his bank robberies."
  },
  {
    fact:
      "In the 1980s, Pablo Escobar’s Medellin Cartel was spending $2,500 a month on rubber bands just to hold all their cash."
  },
  {
    fact:
      "Pablo Escobar burnt over $1million in cash to keep his daughter warm while they were on the run."
  }
];

function buildingDeaths() {
  return Promise.all(deaths.map(death => Death.create(death)));
}

function buildingMafiaFacts() {
  return Promise.all(mafiaFacts.map(fact => Fact.create(fact)));
}

function seed() {
  return buildingDeaths().then(() => buildingMafiaFacts());
}

console.log("Syncing Database baby");

db
  .sync({ force: true })
  .then(() => {
    console.log("Seeding database");
    return seed();
  })
  .then(() => console.log("Seeding Successful"))
  .catch(err => {
    console.error("Error while seeding");
    console.error(err.stack);
  })
  .finally(() => {
    db.close();
    return null;
  });
