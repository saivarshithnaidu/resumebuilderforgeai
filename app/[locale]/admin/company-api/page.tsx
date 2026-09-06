import CompanyAPIClient from './CompanyAPIClient';

export const metadata = {
    title: 'Company Data API | ResumeForge AI Admin',
    description: 'Manage secure API access for your company to pull users, payments, and invoices data.',
};

export default function CompanyAPIPage({ params }: { params: { locale: string } }) {
    return <CompanyAPIClient locale={params.locale} />;
}
