'use client';

import { useState } from 'react';
import {
    Plus,
    Trash2,
    Save,
    Upload,
    Sparkles,
    Pencil,
    Star,
    Image as ImageIcon,
    MessageSquare,
    Phone,
    MapPin,
    Building2,
    Layers,
    User,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

interface Testimonial {
    id: string;
    clientName: string;
    clientRole: string;
    rating: number;
    quote: string;
    avatarUrl: string;
    status: 'published' | 'draft';
}

interface PartnerLogo {
    id: string;
    name: string;
    type: 'client' | 'sponsor';
    logoUrl: string;
}

interface ContactMessage {
    id: string;
    name: string;
    email: string;
    category: string;
    categoryOther?: string;
    message: string;
    date: string;
}

export default function ContentMediaSettingsPage() {
    // Testimonials State
    const [testimonials, setTestimonials] = useState<Testimonial[]>([
        {
            id: '1',
            clientName: 'Sarah & Michael Johnson',
            clientRole: 'Wedding Clients',
            rating: 5,
            quote: 'The wedding decor and reception lighting blew our guests away! Truly an effortless and magical planning experience.',
            avatarUrl: '',
            status: 'published',
        },
        {
            id: '2',
            clientName: 'David Sterling',
            clientRole: 'VP Marketing, Nexus Global',
            rating: 5,
            quote: 'Handled our annual tech summit with 1,200 attendees seamlessly. AV production and check-ins ran perfectly on schedule.',
            avatarUrl: '',
            status: 'published',
        },
    ]);

    // Partner Logos State
    const [partnerLogos, setPartnerLogos] = useState<PartnerLogo[]>([
        { id: '1', name: 'Nexus Tech Solutions', type: 'sponsor', logoUrl: '' },
        { id: '2', name: 'Apex Event Decor', type: 'client', logoUrl: '' },
        { id: '3', name: 'Grand Horizon Resorts', type: 'sponsor', logoUrl: '' },
    ]);

    // Contact Us State
    const [contactEmail, setContactEmail] = useState('events@domain.com');
    const [contactPhone, setContactPhone] = useState('+1 (888) 234-5678');
    const [contactAddress, setContactAddress] = useState('100 Celebration Way, Suite 400, New York, NY 10001');
    const [latitude, setLatitude] = useState('40.7128');
    const [longitude, setLongitude] = useState('-74.0060');

    // Submitted Messages State
    const [messages, setMessages] = useState<ContactMessage[]>([
        {
            id: '101',
            name: 'Elena Rostova',
            email: 'elena@example.com',
            category: 'Wedding Inquiry',
            message: 'Looking for full wedding planning and stage floral decor for December 2026.',
            date: '2026-07-20',
        },
        {
            id: '102',
            name: 'Robert Vance',
            email: 'rvance@vancecorp.com',
            category: 'Other',
            categoryOther: 'Annual Corporate Gala',
            message: 'Need a quote for lighting and sound staging for 500 executives.',
            date: '2026-07-21',
        },
    ]);

    const [isSaving, setIsSaving] = useState(false);

    const handleSaveAll = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            toast.success('Content and Media settings saved successfully!');
        }, 600);
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
                <div>
                    
                    <h1 className="mt-1 text-2xl font-bold tracking-tight">Content, Media & Contact Management</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage gallery showcases, client reviews, partner logo marquee, and contact form inquiries.
                    </p>
                </div>

                <Button size="sm" onClick={handleSaveAll} disabled={isSaving} className="gap-2">
                    <Save className="h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
            </div>

            <Tabs defaultValue="testimonials" className="w-full space-y-6">
                <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
                    <TabsTrigger value="testimonials" className="gap-2">
                        <Star className="h-4 w-4" /> Testimonials
                    </TabsTrigger>
                    <TabsTrigger value="partners" className="gap-2">
                        <Building2 className="h-4 w-4" /> Clients & Logos
                    </TabsTrigger>
                    <TabsTrigger value="contact" className="gap-2">
                        <Phone className="h-4 w-4" /> Contact Us & Map
                    </TabsTrigger>
                </TabsList>

                {/* Testimonials Tab */}
                <TabsContent value="testimonials" className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle className="text-lg">Client Reviews & Testimonials</CardTitle>
                                <CardDescription>Manage customer feedback cards, star ratings, and avatars.</CardDescription>
                            </div>
                            <Button size="sm" className="gap-1.5">
                                <Plus className="h-4 w-4" /> Add Testimonial
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {testimonials.map((testi) => (
                                <div key={testi.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-12 w-12 border">
                                            <AvatarImage src={testi.avatarUrl} />
                                            <AvatarFallback className="bg-primary/10 font-bold text-primary">
                                                {testi.clientName.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold">{testi.clientName}</h4>
                                                <Badge variant="outline" className="text-[10px]">
                                                    {testi.clientRole}
                                                </Badge>
                                                <div className="flex items-center text-amber-500">
                                                    {Array.from({ length: testi.rating }).map((_, i) => (
                                                        <Star key={i} className="h-3 w-3 fill-current" />
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-xs italic text-muted-foreground">"{testi.quote}"</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Partners / Logo Wall Tab */}
                <TabsContent value="partners" className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle className="text-lg">Clients & Sponsors Logo Wall</CardTitle>
                                <CardDescription>Partner brand logos for the marquee scrolling wall.</CardDescription>
                            </div>
                            <Button size="sm" className="gap-1.5">
                                <Plus className="h-4 w-4" /> Add Partner Logo
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                                {partnerLogos.map((partner) => (
                                    <div key={partner.id} className="flex items-center justify-between rounded-lg border p-3">
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-semibold">{partner.name}</h4>
                                            <Badge variant="secondary" className="text-[10px] capitalize">
                                                {partner.type}
                                            </Badge>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Contact & Map Tab */}
                <TabsContent value="contact" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Contact Information & Google Maps Embed</CardTitle>
                            <CardDescription>Location coordinates, support emails, and map pin location.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="contactEmail">Public Contact Email</Label>
                                    <Input
                                        id="contactEmail"
                                        value={contactEmail}
                                        onChange={(e) => setContactEmail(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contactPhone">Public Phone Number</Label>
                                    <Input
                                        id="contactPhone"
                                        value={contactPhone}
                                        onChange={(e) => setContactPhone(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="contactAddress">Physical Address</Label>
                                <Input
                                    id="contactAddress"
                                    value={contactAddress}
                                    onChange={(e) => setContactAddress(e.target.value)}
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="latitude">Latitude Coordinate</Label>
                                    <Input
                                        id="latitude"
                                        value={latitude}
                                        onChange={(e) => setLatitude(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="longitude">Longitude Coordinate</Label>
                                    <Input
                                        id="longitude"
                                        value={longitude}
                                        onChange={(e) => setLongitude(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Submitted Messages List */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Received Contact Submissions</CardTitle>
                            <CardDescription>Messages submitted through the public website contact form.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {messages.map((msg) => (
                                <div key={msg.id} className="rounded-lg border p-4 space-y-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-sm">{msg.name}</h4>
                                            <span className="text-xs text-muted-foreground">({msg.email})</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-[10px]">
                                                {msg.category} {msg.categoryOther ? `- ${msg.categoryOther}` : ''}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">{msg.date}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-foreground">{msg.message}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
