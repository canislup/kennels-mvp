import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
    const breeds = [
        "Affenpinscher", "Afghan Hound", "Aidi", "Airedale Terrier", "Akbash", "Akita",
        "Alano Español", "Alaskan Klee Kai", "Alaskan Malamute", "Alpine Dachsbracke",
        "American Bulldog", "American Eskimo Dog", "American Foxhound", "American Hairless Terrier",
        "American Leopard Hound", "American Staffordshire Terrier", "American Water Spaniel",
        "Anatolian Shepherd Dog", "Appenzeller Sennenhund", "Australian Cattle Dog",
        "Australian Kelpie", "Australian Shepherd", "Australian Terrier", "Azawakh", "Barbet",
        "Basenji", "Basset Hound", "Beagle", "Bearded Collie", "Beauceron", "Bedlington Terrier",
        "Belgian Malinois", "Belgian Sheepdog", "Belgian Tervuren", "Bergamasco Sheepdog",
        "Berger Picard", "Bernese Mountain Dog", "Bichon Frise", "Biewer Terrier",
        "Black and Tan Coonhound", "Black Russian Terrier", "Bloodhound", "Bluetick Coonhound",
        "Boerboel", "Bolognese", "Border Collie", "Border Terrier", "Borzoi", "Boston Terrier",
        "Bouvier des Flandres", "Boxer", "Boykin Spaniel", "Bracco Italiano", "Braque du Bourbonnais",
        "Briard", "Brittany", "Broholmer", "Brussels Griffon", "Bull Terrier", "Bulldog",
        "Bullmastiff", "Cairn Terrier", "Canaan Dog", "Canadian Eskimo Dog", "Cane Corso",
        "Cardigan Welsh Corgi", "Carolina Dog", "Catahoula Leopard Dog", "Caucasian Shepherd Dog",
        "Cavalier King Charles Spaniel", "Central Asian Shepherd Dog", "Cesky Terrier",
        "Chesapeake Bay Retriever", "Chihuahua", "Chinese Crested", "Chinese Shar-Pei", "Chinook",
        "Chow Chow", "Cirneco dell'Etna", "Clumber Spaniel", "Cocker Spaniel", "Collie",
        "Coton de Tulear", "Curly-Coated Retriever", "Dachshund", "Dalmatian", "Dandie Dinmont Terrier",
        "Doberman Pinscher", "Dogo Argentino", "Dogue de Bordeaux", "Dutch Shepherd",
        "English Cocker Spaniel", "English Foxhound", "English Setter", "English Springer Spaniel",
        "English Toy Spaniel", "Entlebucher Mountain Dog", "Estrela Mountain Dog", "Eurasier",
        "Field Spaniel", "Fila Brasileiro", "Finnish Lapphund", "Finnish Spitz", "Flat-Coated Retriever",
        "French Bulldog", "French Spaniel", "Galgo Español", "German Pinscher", "German Shepherd Dog",
        "German Shorthaired Pointer", "German Wirehaired Pointer", "Giant Schnauzer",
        "Glen of Imaal Terrier", "Golden Retriever", "Gordon Setter", "Grand Basset Griffon Vendéen",
        "Great Dane", "Great Pyrenees", "Greater Swiss Mountain Dog", "Greyhound", "Hamiltonstovare",
        "Harrier", "Havanese", "Hokkaido", "Hovawart", "Ibizan Hound", "Icelandic Sheepdog",
        "Irish Red and White Setter", "Irish Setter", "Irish Terrier", "Irish Water Spaniel",
        "Irish Wolfhound", "Italian Greyhound", "Jagdterrier", "Japanese Chin", "Japanese Spitz",
        "Jindo", "Kai Ken", "Kangal Shepherd Dog", "Karelian Bear Dog", "Keeshond", "Kerry Blue Terrier",
        "Kishu Ken", "Komondor", "Kromfohrlander", "Kuvasz", "Labrador Retriever", "Lagotto Romagnolo",
        "Lakeland Terrier", "Lancashire Heeler", "Lapponian Herder", "Leonberger", "Lhasa Apso",
        "Lowchen", "Maltese", "Manchester Terrier", "Mastiff", "Miniature American Shepherd",
        "Miniature Bull Terrier", "Miniature Pinscher", "Miniature Schnauzer", "Mudi",
        "Neapolitan Mastiff", "Newfoundland", "Norfolk Terrier", "Norwegian Buhund", "Norwegian Elkhound",
        "Norwegian Lundehund", "Norwich Terrier", "Nova Scotia Duck Tolling Retriever",
        "Old English Sheepdog", "Otterhound", "Papillon", "Parson Russell Terrier", "Pekingese",
        "Pembroke Welsh Corgi", "Peruvian Hairless Dog", "Petit Basset Griffon Vendeen", "Pharaoh Hound",
        "Plott Hound", "Pointer", "Pomeranian", "Poodle", "Portuguese Podengo", "Portuguese Water Dog",
        "Pug", "Puli", "Pumi", "Pyrenean Mastiff", "Pyrenean Shepherd", "Rafeiro do Alentejo",
        "Rat Terrier", "Redbone Coonhound", "Rhodesian Ridgeback", "Rottweiler", "Russell Terrier",
        "Saint Bernard", "Saluki", "Samoyed", "Schapendoes", "Schipperke", "Scottish Deerhound",
        "Scottish Terrier", "Sealyham Terrier", "Shetland Sheepdog", "Shiba Inu", "Shih Tzu",
        "Shikoku", "Siberian Husky", "Silky Terrier", "Sloughi", "Small Munsterlander",
        "Soft Coated Wheaten Terrier", "Spanish Water Dog", "Spinone Italiano", "Stabyhoun",
        "Staffordshire Bull Terrier", "Standard Schnauzer", "Sussex Spaniel", "Swedish Vallhund",
        "Thai Ridgeback", "Tibetan Mastiff", "Tibetan Spaniel", "Tibetan Terrier", "Toy Fox Terrier",
        "Treeing Tennessee Brindle", "Treeing Walker Coonhound", "Vizsla", "Weimaraner",
        "Welsh Springer Spaniel", "Welsh Terrier", "West Highland White Terrier", "Whippet",
        "Wire Fox Terrier", "Wirehaired Pointing Griffon", "Wirehaired Vizsla", "Xoloitzcuintli",
        "Yakutian Laika", "Yorkshire Terrier"
    ];

    try {
        // Map over the array to create the objects Prisma expects
        const breedData = breeds.map(name => ({ name }));

        // Use createMany to insert them all efficiently
        const result = await prisma.breed.createMany({
            data: breedData,
            skipDuplicates: true, // Prevents crashing if you accidentally run it twice
        });

        return NextResponse.json({
            message: "Successfully seeded breeds!",
            count: result.count
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to seed breeds" }, { status: 500 });
    }
}