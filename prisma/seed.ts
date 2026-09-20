import { PrismaClient, DogStatus, LitterStatus } from "@/prisma/generated/client";
import { PrismaPg} from "@prisma/adapter-pg";
import { slugify } from "@/lib/slug";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});
export const prisma = new PrismaClient({ adapter });

// Placeholder photo generator (place.dog serves stable stock dog photos by id).
// Used only to populate demo/seed data — real kennels upload via Cloudinary.
let placeholderId = 1;
function dogPhotos(count: number): string[] {
    return Array.from({ length: count }, () => `https://place.dog/500/400?id=${placeholderId++}`);
}
function logoPhoto(): string {
    return `https://place.dog/200/200?id=${placeholderId++}`;
}

// Returns a Date offset from today — used for Litter.expectedGoHomeDate.
function daysFromNow(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
}

async function main() {
    console.log('🌱 Starting database seed...')

    await prisma.dog.deleteMany()
    await prisma.kennel.deleteMany()
    await prisma.owner.deleteMany()

    // 1. Define the massive array of deeply nested data
    const seedData = [
        {
            fullName: 'Lucas Fontes',
            email: 'lucas@cariocafrenchies.com',
            phoneNumber: '21988887777',
            passwordHash: 'hashed_password_123',
            kennel: {
                create: {
                    name: 'Carioca Frenchies',
                    cnpj: '11.222.333/0001-44',
                    city: 'Rio de Janeiro',
                    state: 'RJ',
                    cbkcRegistration: 'CBKC-2001',
                    slug: slugify('Carioca Frenchies'),
                    location: 'Rio de Janeiro, RJ',
                    prestigeScore: 92,
                    logoUrl: logoPhoto(),
                    description: 'Carioca Frenchies has been raising healthy, well-socialized French Bulldogs in Rio de Janeiro for over a decade. Every puppy leaves us vet-checked, microchipped, and already comfortable with city life.',
                    dogs: {
                        create: [
                            { name: 'Stitch', breed: 'French Bulldog', gender: 'Male', status: DogStatus.BREEDING_STOCK, lineage: 'Blue Frenchies BR', photoUrls: dogPhotos(3) },
                            { name: 'Lola', breed: 'French Bulldog', gender: 'Female', status: DogStatus.AVAILABLE_PUPPY, photoUrls: dogPhotos(3) }
                        ]
                    },
                    litters: {
                        create: [
                            { breed: 'French Bulldog', puppyCount: 4, expectedGoHomeDate: daysFromNow(21), status: LitterStatus.AVAILABLE }
                        ]
                    }
                }
            }
        },
        {
            fullName: 'Mariana Ribeiro',
            email: 'mariana@mineiropugs.com',
            phoneNumber: '31977776666',
            passwordHash: 'hashed_password_123',
            kennel: {
                create: {
                    name: 'Guardiões de Minas',
                    cnpj: '22.333.444/0001-55',
                    city: 'Belo Horizonte',
                    state: 'MG',
                    cbkcRegistration: 'CBKC-2002',
                    slug: slugify('Guardiões de Minas'),
                    location: 'Belo Horizonte, MG',
                    prestigeScore: 68,
                    logoUrl: logoPhoto(),
                    description: 'Nestled in the hills of Belo Horizonte, Guardiões de Minas specializes in companion-quality Pugs raised underfoot in a family home. Health testing and temperament come first, always.',
                    dogs: {
                        create: [
                            { name: 'Thor', breed: 'Pug', gender: 'Male', status: DogStatus.BREEDING_STOCK, photoUrls: dogPhotos(2) },
                            { name: 'Mel', breed: 'Pug', gender: 'Female', status: DogStatus.RESERVED, photoUrls: dogPhotos(2) }
                        ]
                    },
                    litters: {
                        create: [
                            { breed: 'Pug', puppyCount: 2, expectedGoHomeDate: daysFromNow(10), status: LitterStatus.RESERVED }
                        ]
                    }
                }
            }
        },
        {
            fullName: 'Felipe Camargo',
            email: 'felipe@pamparoots.com',
            phoneNumber: '51966665555',
            passwordHash: 'hashed_password_123',
            kennel: {
                create: {
                    name: 'Pampa Roots',
                    cnpj: '33.444.555/0001-66',
                    city: 'Porto Alegre',
                    state: 'RS',
                    cbkcRegistration: 'CBKC-2003',
                    slug: slugify('Pampa Roots'),
                    location: 'Porto Alegre, RS',
                    prestigeScore: 77,
                    logoUrl: logoPhoto(),
                    description: 'Pampa Roots breeds working-line Rottweilers on an open pasture outside Porto Alegre, with imported German bloodlines and a strong focus on structure, drive, and stable temperament.',
                    dogs: {
                        create: [
                            { name: 'Zeus', breed: 'Rottweiler', gender: 'Male', status: DogStatus.BREEDING_STOCK, lineage: 'German Import', photoUrls: dogPhotos(3) },
                            { name: 'Atena', breed: 'Rottweiler', gender: 'Female', status: DogStatus.AVAILABLE_PUPPY, photoUrls: dogPhotos(2) },
                            { name: 'Ares', breed: 'Rottweiler', gender: 'Male', status: DogStatus.SOLD, photoUrls: dogPhotos(2) }
                        ]
                    },
                    litters: {
                        create: [
                            { breed: 'Rottweiler', puppyCount: 5, expectedGoHomeDate: daysFromNow(14), status: LitterStatus.AVAILABLE },
                            { breed: 'Rottweiler', puppyCount: 3, expectedGoHomeDate: daysFromNow(-30), status: LitterStatus.SOLD_OUT }
                        ]
                    }
                }
            }
        },
        {
            fullName: 'Beatriz Nogueira',
            email: 'beatriz@cerradopoms.com',
            phoneNumber: '62955554444',
            passwordHash: 'hashed_password_123',
            kennel: {
                create: {
                    name: 'Cerrado Poms',
                    cnpj: '44.555.666/0001-77',
                    city: 'Goiânia',
                    state: 'GO',
                    cbkcRegistration: 'CBKC-2004',
                    slug: slugify('Cerrado Poms'),
                    location: 'Goiânia, GO',
                    prestigeScore: 54,
                    logoUrl: logoPhoto(),
                    description: 'Cerrado Poms is a small home-based kennel in Goiânia dedicated to the Spitz Alemão (Pomeranian). We keep litters small so every puppy gets one-on-one attention before going home.',
                    dogs: {
                        create: [
                            { name: 'Snow', breed: 'Spitz Alemão', gender: 'Male', status: DogStatus.AVAILABLE_PUPPY, photoUrls: dogPhotos(2) },
                            { name: 'Chanel', breed: 'Spitz Alemão', gender: 'Female', status: DogStatus.BREEDING_STOCK, lineage: 'Chiao Li Ya Bloodline', photoUrls: dogPhotos(3) }
                        ]
                    },
                    litters: {
                        create: [
                            { breed: 'Spitz Alemão', puppyCount: 3, expectedGoHomeDate: daysFromNow(18), status: LitterStatus.AVAILABLE }
                        ]
                    }
                }
            }
        },
        {
            fullName: 'Thiago Mendes',
            email: 'thiago@agilitybrasil.com',
            phoneNumber: '11944443333',
            passwordHash: 'hashed_password_123',
            kennel: {
                create: {
                    name: 'Agility Brasil',
                    cnpj: '55.666.777/0001-88',
                    city: 'Campinas',
                    state: 'SP',
                    cbkcRegistration: 'CBKC-2005',
                    slug: slugify('Agility Brasil'),
                    location: 'Campinas, SP',
                    prestigeScore: 88,
                    logoUrl: logoPhoto(),
                    description: 'Agility Brasil breeds Border Collies for sport and companionship alike, with ISDS-registered working lines out of Campinas. Our dogs are raised with early agility exposure and structured socialization.',
                    dogs: {
                        create: [
                            { name: 'Flash', breed: 'Border Collie', gender: 'Male', status: DogStatus.BREEDING_STOCK, lineage: 'ISDS Registered', photoUrls: dogPhotos(3) },
                            { name: 'Lassie', breed: 'Border Collie', gender: 'Female', status: DogStatus.AVAILABLE_PUPPY, photoUrls: dogPhotos(2) }
                        ]
                    },
                    litters: {
                        create: [
                            { breed: 'Border Collie', puppyCount: 4, expectedGoHomeDate: daysFromNow(28), status: LitterStatus.AVAILABLE }
                        ]
                    }
                }
            }
        },
        {
            fullName: 'Camila Rocha',
            email: 'camila@pequenosnobres.com',
            phoneNumber: '41933332222',
            passwordHash: 'hashed_password_123',
            kennel: {
                create: {
                    name: 'Pequenos Nobres',
                    cnpj: '66.777.888/0001-99',
                    city: 'Curitiba',
                    state: 'PR',
                    cbkcRegistration: 'CBKC-2006',
                    slug: slugify('Pequenos Nobres'),
                    location: 'Curitiba, PR',
                    prestigeScore: 41,
                    logoUrl: logoPhoto(),
                    description: 'Pequenos Nobres is a boutique Shih Tzu kennel in Curitiba, breeding a handful of litters a year with an emphasis on temperament, coat quality, and lifelong breeder support for new owners.',
                    dogs: {
                        create: [
                            { name: 'Sushi', breed: 'Shih Tzu', gender: 'Male', status: DogStatus.AVAILABLE_PUPPY, photoUrls: dogPhotos(2) },
                            { name: 'Kiwi', breed: 'Shih Tzu', gender: 'Female', status: DogStatus.RESERVED, photoUrls: dogPhotos(2) }
                        ]
                    },
                    litters: {
                        create: [
                            { breed: 'Shih Tzu', puppyCount: 2, expectedGoHomeDate: daysFromNow(35), status: LitterStatus.PLANNED }
                        ]
                    }
                }
            }
        },
        {
            fullName: 'Rafael Martins',
            email: 'rafael@capitaldobes.com',
            phoneNumber: '61922221111',
            passwordHash: 'hashed_password_123',
            kennel: {
                create: {
                    name: 'Capital Dobes',
                    cnpj: '77.888.999/0001-00',
                    city: 'Brasília',
                    state: 'DF',
                    cbkcRegistration: 'CBKC-2007',
                    slug: slugify('Capital Dobes'),
                    location: 'Brasília, DF',
                    prestigeScore: 73,
                    logoUrl: logoPhoto(),
                    description: 'Capital Dobes raises European-line Dobermans in Brasília, prioritizing sound temperament and health clearances over show trophies. Puppies come home leash-trained and confident.',
                    dogs: {
                        create: [
                            { name: 'Hades', breed: 'Doberman', gender: 'Male', status: DogStatus.BREEDING_STOCK, lineage: 'Altobello', photoUrls: dogPhotos(3) },
                            { name: 'Hera', breed: 'Doberman', gender: 'Female', status: DogStatus.AVAILABLE_PUPPY, photoUrls: dogPhotos(2) }
                        ]
                    },
                    litters: {
                        create: [
                            { breed: 'Doberman', puppyCount: 6, expectedGoHomeDate: daysFromNow(7), status: LitterStatus.AVAILABLE }
                        ]
                    }
                }
            }
        },
        {
            fullName: 'Juliana Carvalho',
            email: 'juliana@marelabs.com',
            phoneNumber: '71911110000',
            passwordHash: 'hashed_password_123',
            kennel: {
                create: {
                    name: 'Maré Labs',
                    cnpj: '88.999.000/0001-11',
                    city: 'Salvador',
                    state: 'BA',
                    cbkcRegistration: 'CBKC-2008',
                    slug: slugify('Maré Labs'),
                    location: 'Salvador, BA',
                    prestigeScore: 85,
                    logoUrl: logoPhoto(),
                    description: 'Maré Labs is a coastal kennel in Salvador specializing in Chocolate and Yellow Labrador Retrievers, bred for the easygoing, people-loving temperament the breed is known for.',
                    dogs: {
                        create: [
                            { name: 'Marley', breed: 'Labrador Retriever', gender: 'Male', status: DogStatus.BREEDING_STOCK, photoUrls: dogPhotos(3) },
                            { name: 'Nala', breed: 'Labrador Retriever', gender: 'Female', status: DogStatus.AVAILABLE_PUPPY, lineage: 'Chocolate Labs BR', photoUrls: dogPhotos(3) }
                        ]
                    },
                    litters: {
                        create: [
                            { breed: 'Labrador Retriever', puppyCount: 5, expectedGoHomeDate: daysFromNow(12), status: LitterStatus.AVAILABLE }
                        ]
                    }
                }
            }
        },
        {
            fullName: 'Eduardo Lima',
            email: 'eduardo@sertaozinhokennel.com',
            phoneNumber: '16999998888',
            passwordHash: 'hashed_password_123',
            kennel: {
                create: {
                    name: 'Sertãozinho Kennel',
                    cnpj: '99.000.111/0001-22',
                    city: 'Ribeirão Preto',
                    state: 'SP',
                    cbkcRegistration: 'CBKC-2009',
                    slug: slugify('Sertãozinho Kennel'),
                    location: 'Ribeirão Preto, SP',
                    prestigeScore: 36,
                    logoUrl: logoPhoto(),
                    description: 'Sertãozinho Kennel is a newer breeder in Ribeirão Preto raising Miniature Schnauzers in a family setting, with puppies socialized around children and other pets from day one.',
                    dogs: {
                        create: [
                            { name: 'Bidu', breed: 'Schnauzer', gender: 'Male', status: DogStatus.AVAILABLE_PUPPY, photoUrls: dogPhotos(2) },
                            { name: 'Nina', breed: 'Schnauzer', gender: 'Female', status: DogStatus.BREEDING_STOCK, photoUrls: dogPhotos(2) }
                        ]
                    },
                    litters: {
                        create: [
                            { breed: 'Schnauzer', puppyCount: 3, expectedGoHomeDate: daysFromNow(24), status: LitterStatus.AVAILABLE }
                        ]
                    }
                }
            }
        },
        {
            fullName: 'Vanessa Almeida',
            email: 'vanessa@royalgoldens.com',
            phoneNumber: '47988887777',
            passwordHash: 'hashed_password_123',
            kennel: {
                create: {
                    name: 'Royal Goldens SC',
                    cnpj: '00.111.222/0001-33',
                    city: 'Joinville',
                    state: 'SC',
                    cbkcRegistration: 'CBKC-2010',
                    slug: slugify('Royal Goldens SC'),
                    location: 'Joinville, SC',
                    prestigeScore: 97,
                    logoUrl: logoPhoto(),
                    description: "Royal Goldens SC is southern Brazil's top-rated Golden Retriever kennel, with three generations of champion bloodlines out of Joinville. Every litter is health-tested and raised with early neurological stimulation.",
                    dogs: {
                        create: [
                            { name: 'Simba', breed: 'Golden Retriever', gender: 'Male', status: DogStatus.AVAILABLE_PUPPY, photoUrls: dogPhotos(3) },
                            { name: 'Kyra', breed: 'Golden Retriever', gender: 'Female', status: DogStatus.BREEDING_STOCK, lineage: 'Golden Rush', photoUrls: dogPhotos(3) },
                            { name: 'Buddy', breed: 'Golden Retriever', gender: 'Male', status: DogStatus.SOLD, photoUrls: dogPhotos(2) }
                        ]
                    },
                    litters: {
                        create: [
                            { breed: 'Golden Retriever', puppyCount: 6, expectedGoHomeDate: daysFromNow(5), status: LitterStatus.AVAILABLE },
                            { breed: 'Golden Retriever', puppyCount: 0, expectedGoHomeDate: daysFromNow(90), status: LitterStatus.PLANNED }
                        ]
                    }
                }
            }
        }
    ]

    // 2. Loop through the array and insert them sequentially
    console.log(`Injecting ${seedData.length} kennels into the database...`)

    for (const ownerData of seedData) {
        const createdOwner = await prisma.owner.create({
            data: ownerData
        })
        console.log(`✅ Created ${createdOwner.fullName}`)
    }

    console.log('🎉 All dummy data seeded successfully!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
