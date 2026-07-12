import { PrismaClient, DogStatus } from "@/prisma/generated/client";
import { PrismaPg} from "@prisma/adapter-pg";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});
export const prisma = new PrismaClient({ adapter });

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
                    dogs: {
                        create: [
                            { name: 'Stitch', breed: 'French Bulldog', gender: 'Male', status: DogStatus.BREEDING_STOCK, lineage: 'Blue Frenchies BR' },
                            { name: 'Lola', breed: 'French Bulldog', gender: 'Female', status: DogStatus.AVAILABLE_PUPPY }
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
                    dogs: {
                        create: [
                            { name: 'Thor', breed: 'Pug', gender: 'Male', status: DogStatus.BREEDING_STOCK },
                            { name: 'Mel', breed: 'Pug', gender: 'Female', status: DogStatus.RESERVED }
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
                    dogs: {
                        create: [
                            { name: 'Zeus', breed: 'Rottweiler', gender: 'Male', status: DogStatus.BREEDING_STOCK, lineage: 'German Import' },
                            { name: 'Atena', breed: 'Rottweiler', gender: 'Female', status: DogStatus.AVAILABLE_PUPPY },
                            { name: 'Ares', breed: 'Rottweiler', gender: 'Male', status: DogStatus.SOLD }
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
                    dogs: {
                        create: [
                            { name: 'Snow', breed: 'Spitz Alemão', gender: 'Male', status: DogStatus.AVAILABLE_PUPPY },
                            { name: 'Chanel', breed: 'Spitz Alemão', gender: 'Female', status: DogStatus.BREEDING_STOCK, lineage: 'Chiao Li Ya Bloodline' }
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
                    dogs: {
                        create: [
                            { name: 'Flash', breed: 'Border Collie', gender: 'Male', status: DogStatus.BREEDING_STOCK, lineage: 'ISDS Registered' },
                            { name: 'Lassie', breed: 'Border Collie', gender: 'Female', status: DogStatus.AVAILABLE_PUPPY }
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
                    dogs: {
                        create: [
                            { name: 'Sushi', breed: 'Shih Tzu', gender: 'Male', status: DogStatus.AVAILABLE_PUPPY },
                            { name: 'Kiwi', breed: 'Shih Tzu', gender: 'Female', status: DogStatus.RESERVED }
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
                    dogs: {
                        create: [
                            { name: 'Hades', breed: 'Doberman', gender: 'Male', status: DogStatus.BREEDING_STOCK, lineage: 'Altobello' },
                            { name: 'Hera', breed: 'Doberman', gender: 'Female', status: DogStatus.AVAILABLE_PUPPY }
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
                    dogs: {
                        create: [
                            { name: 'Marley', breed: 'Labrador Retriever', gender: 'Male', status: DogStatus.BREEDING_STOCK },
                            { name: 'Nala', breed: 'Labrador Retriever', gender: 'Female', status: DogStatus.AVAILABLE_PUPPY, lineage: 'Chocolate Labs BR' }
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
                    dogs: {
                        create: [
                            { name: 'Bidu', breed: 'Schnauzer', gender: 'Male', status: DogStatus.AVAILABLE_PUPPY },
                            { name: 'Nina', breed: 'Schnauzer', gender: 'Female', status: DogStatus.BREEDING_STOCK }
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
                    dogs: {
                        create: [
                            { name: 'Simba', breed: 'Golden Retriever', gender: 'Male', status: DogStatus.AVAILABLE_PUPPY },
                            { name: 'Kyra', breed: 'Golden Retriever', gender: 'Female', status: DogStatus.BREEDING_STOCK, lineage: 'Golden Rush' },
                            { name: 'Buddy', breed: 'Golden Retriever', gender: 'Male', status: DogStatus.SOLD }
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