'use client';

import { useState, useMemo } from 'react';
import { Sparkles, Trash2, Mail, Calendar, User, Search, GripVertical, HelpCircle, RotateCcw } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmResetDialog } from '@/components/common/confirm-reset-dialog';

interface ContactMessage {
    id: string;
    num: number;
    name: string;
    email: string;
    category: string;
    categoryOther?: string;
    message: string;
    date: string;
}

const initialMessages: ContactMessage[] = [
    {
        id: '101',
        num: 1,
        name: 'Elena Rostova',
        email: 'elena@example.com',
        category: 'Wedding Inquiry',
        message: 'Looking for full wedding planning and stage floral decor for December 2026.',
        date: '2026-07-20',
    },
    {
        id: '102',
        num: 2,
        name: 'Robert Vance',
        email: 'rvance@vancecorp.com',
        category: 'Other',
        categoryOther: 'Annual Corporate Gala',
        message: 'Need a quote for lighting and sound staging for 500 executives.',
        date: '2026-07-21',
    },
];

export default function ContactListPage() {
    const [messages, setMessages] = useState<ContactMessage[]>(initialMessages);
    const [searchQuery, setSearchQuery] = useState('');
    const [resetDialogOpen, setResetDialogOpen] = useState(false);

    const filteredMessages = useMemo(() => {
        if (!searchQuery.trim()) return messages;
        const q = searchQuery.toLowerCase();
        return messages.filter(
            (m) =>
                m.name.toLowerCase().includes(q) ||
                m.email.toLowerCase().includes(q) ||
                m.category.toLowerCase().includes(q) ||
                m.message.toLowerCase().includes(q)
        );
    }, [messages, searchQuery]);

    const handleReset = () => {
        setMessages(initialMessages);
        setSearchQuery('');
        toast.info('Contact submissions list reset to defaults.');
    };

    const handleDeleteMessage = (id: string) => {
        setMessages(messages.filter((m) => m.id !== id));
        toast.success('Contact submission deleted.');
    };

    return (
        <div className="space-y-6">
            {/* Top Page Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
                <div>
                    
                    <h1 className="mt-1 text-2xl font-bold tracking-tight">Contact Submissions List</h1>
                    <p className="text-sm text-muted-foreground">View and manage messages submitted via the public contact form.</p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => toast.info('View client contact form submissions and category inquiries.')} className="h-8 px-3 text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50">
                        <HelpCircle className="h-3.5 w-3.5 text-slate-400 mr-1" /> How It Works
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setResetDialogOpen(true)} className="h-8 px-3 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50">
                        <RotateCcw className="h-3.5 w-3.5 text-rose-500 mr-1" /> Reset
                    </Button>
                </div>
            </div>

            {/* Submissions Management Table Card */}
            <Card className="shadow-xs border-slate-200">
                <CardHeader className="pb-3 border-b bg-slate-50/50">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-base font-bold">Received Contact Inquiries</CardTitle>
                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-bold px-2">
                                {filteredMessages.length} Submissions
                            </Badge>
                        </div>

                        {/* Search Filter Input */}
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                            <Input
                                type="text"
                                placeholder="Search submissions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-8 pl-8 text-xs bg-background border-slate-200"
                            />
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/80">
                            <TableRow>
                                <TableHead className="w-[50px] font-bold text-[11px] text-slate-700">#</TableHead>
                                <TableHead className="w-[220px] font-bold text-[11px] text-slate-700">Contact Person</TableHead>
                                <TableHead className="w-[180px] font-bold text-[11px] text-slate-700">Category</TableHead>
                                <TableHead className="font-bold text-[11px] text-slate-700">Message</TableHead>
                                <TableHead className="w-[120px] font-bold text-[11px] text-slate-700">Date</TableHead>
                                <TableHead className="w-[80px] font-bold text-[11px] text-slate-700 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {filteredMessages.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-500">
                                        No contact submissions found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredMessages.map((msg, index) => (
                                    <TableRow key={msg.id} className="hover:bg-slate-50/60 transition-colors">
                                        {/* Drag handle & index */}
                                        <TableCell className="font-bold text-xs text-slate-500">
                                            <div className="flex items-center gap-1">
                                                <GripVertical className="h-3.5 w-3.5 text-slate-300 cursor-grab" />
                                                <span>{index + 1}</span>
                                            </div>
                                        </TableCell>

                                        {/* Contact Person */}
                                        <TableCell>
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-extrabold text-xs">
                                                    {msg.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-xs text-slate-900 leading-tight">{msg.name}</h4>
                                                    <p className="text-[11px] text-slate-500 font-mono truncate max-w-[170px]">{msg.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Category Badge */}
                                        <TableCell>
                                            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[11px] font-semibold">
                                                {msg.category} {msg.categoryOther ? `- ${msg.categoryOther}` : ''}
                                            </Badge>
                                        </TableCell>

                                        {/* Message */}
                                        <TableCell>
                                            <p className="text-xs text-slate-700 leading-normal line-clamp-2 max-w-xl">
                                                {msg.message}
                                            </p>
                                        </TableCell>

                                        {/* Date */}
                                        <TableCell className="text-xs text-slate-500 font-medium">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                <span>{msg.date}</span>
                                            </div>
                                        </TableCell>

                                        {/* Action Icon Buttons */}
                                        <TableCell className="text-right">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleDeleteMessage(msg.id)}
                                                className="h-8 w-8 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors"
                                                title="Delete Submission"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Footer Stats Note */}
                    <div className="p-3 border-t bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
                        <span>Showing {filteredMessages.length} contact submission records.</span>
                        <span className="text-[11px] text-slate-400 font-medium">Messages submitted via public website contact form</span>
                    </div>
                </CardContent>
            </Card>

            <ConfirmResetDialog
                open={resetDialogOpen}
                onOpenChange={setResetDialogOpen}
                onConfirm={handleReset}
            />
        </div>
    );
}
