import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function createTestEmployees() {
  const db = getFirestore();
  
  const testEmployees = [
    {
      firstName: 'Max',
      lastName: 'Mustermann',
      email: 'max.mustermann@example.com',
      company: 'ACME Corp',
      businessLine: 'Engineering',
      bereich: '',
      competenceCenter: 'Software Development',
      teamName: 'Frontend Team',
      location: 'München',
      grade: 'Senior',
      experienceSinceYear: 2018,
      availableFrom: '2024-02-01',
      availableForStaffing: true,
      profileUrl: 'https://example.com/profile/max',
      externalIds: {},
      active: true,
      normalizedName: 'mustermann|max',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      firstName: 'Anna',
      lastName: 'Schmidt',
      email: 'anna.schmidt@example.com',
      company: 'ACME Corp',
      businessLine: 'Consulting',
      bereich: '',
      competenceCenter: 'Business Analysis',
      teamName: 'Analytics Team',
      location: 'Berlin',
      grade: 'Principal',
      experienceSinceYear: 2015,
      availableFrom: '2024-03-15',
      availableForStaffing: true,
      profileUrl: 'https://example.com/profile/anna',
      externalIds: {},
      active: true,
      normalizedName: 'schmidt|anna',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      firstName: 'Thomas',
      lastName: 'Weber',
      email: 'thomas.weber@example.com',
      company: 'ACME Corp',
      businessLine: 'Engineering',
      bereich: '',
      competenceCenter: 'DevOps',
      teamName: 'Infrastructure Team',
      location: 'Hamburg',
      grade: 'Expert',
      experienceSinceYear: 2020,
      availableFrom: null,
      availableForStaffing: false,
      profileUrl: null,
      externalIds: {},
      active: true,
      normalizedName: 'weber|thomas',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  ];
  
  try {
    for (const employee of testEmployees) {
      await addDoc(collection(db, 'employees'), employee);
      console.log(`Created employee: ${employee.firstName} ${employee.lastName}`);
    }
    alert('Test-Mitarbeiter erfolgreich erstellt!');
  } catch (error) {
    console.error('Fehler beim Erstellen der Test-Mitarbeiter:', error);
    alert('Fehler beim Erstellen der Test-Mitarbeiter');
  }
}
