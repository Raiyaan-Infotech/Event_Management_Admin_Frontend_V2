import { Msg91ConfigContent } from './_components/msg91-config-content';

export const metadata = {
    title: 'MSG91 Configuration | Admin Portal',
    description: 'Configure MSG91 for SMS, OTP and email',
};

export default function Msg91ConfigPage() {
    return <Msg91ConfigContent />;
}
