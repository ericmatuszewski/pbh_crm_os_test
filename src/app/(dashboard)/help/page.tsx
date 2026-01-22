"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Phone,
  Users,
  Calendar,
  FileText,
  HelpCircle,
  Search,
  Keyboard,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  Building2,
  Clock,
  AlertTriangle,
  BookOpen,
  Lightbulb,
  Shield,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AccessibleHeading,
  AccessibleText,
  HelpCard,
  HelpCardGroup,
  QuickTip,
  CallOutcomeHelp,
} from "@/components/accessible";

// Help topics for search
const helpTopics = [
  {
    id: "making-calls",
    title: "Making Calls",
    keywords: ["call", "phone", "dial", "ring", "contact"],
  },
  {
    id: "outcomes",
    title: "Call Outcomes",
    keywords: ["outcome", "result", "completed", "no answer", "voicemail"],
  },
  {
    id: "scheduling",
    title: "Scheduling Calls",
    keywords: ["schedule", "calendar", "appointment", "callback", "reminder"],
  },
  {
    id: "contacts",
    title: "Managing Contacts",
    keywords: ["contact", "customer", "add", "edit", "search"],
  },
  {
    id: "keyboard",
    title: "Keyboard Shortcuts",
    keywords: ["keyboard", "shortcut", "quick", "fast", "hotkey"],
  },
  {
    id: "tips",
    title: "Tips for Success",
    keywords: ["tip", "advice", "help", "best", "practice"],
  },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Filter topics based on search
  const filteredTopics = searchQuery
    ? helpTopics.filter(
        (topic) =>
          topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          topic.keywords.some((k) =>
            k.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    : helpTopics;

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Help & Training"
          subtitle="Everything you need to know about using the system"
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Search */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Search className="h-6 w-6 text-slate-400" />
                  <Input
                    type="search"
                    placeholder="Search help topics... (e.g., 'how to make a call')"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-14 text-lg"
                    aria-label="Search help topics"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <div className="grid gap-4 md:grid-cols-3">
              <Link href="/calls">
                <Card className="hover:bg-blue-50 cursor-pointer transition-colors h-full">
                  <CardContent className="flex items-center gap-4 pt-6">
                    <div className="rounded-full bg-blue-100 p-4">
                      <Phone className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Start Calling</h3>
                      <p className="text-base text-slate-600">
                        Go to today's calls
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/contacts">
                <Card className="hover:bg-purple-50 cursor-pointer transition-colors h-full">
                  <CardContent className="flex items-center gap-4 pt-6">
                    <div className="rounded-full bg-purple-100 p-4">
                      <Users className="h-8 w-8 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Find Contact</h3>
                      <p className="text-base text-slate-600">
                        Search all contacts
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/calls/schedule">
                <Card className="hover:bg-green-50 cursor-pointer transition-colors h-full">
                  <CardContent className="flex items-center gap-4 pt-6">
                    <div className="rounded-full bg-green-100 p-4">
                      <Calendar className="h-8 w-8 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">View Calendar</h3>
                      <p className="text-base text-slate-600">
                        See scheduled calls
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Getting Started */}
            <section id="getting-started">
              <AccessibleHeading level={2} className="mb-6">
                <BookOpen className="inline h-8 w-8 mr-3 text-blue-600" />
                Getting Started
              </AccessibleHeading>

              <HelpCardGroup>
                <HelpCard
                  title="Welcome to the Call Centre System"
                  variant="info"
                  expandable={false}
                  icon={<Lightbulb className="h-6 w-6" />}
                >
                  <div className="space-y-4">
                    <p>
                      This system helps you manage your daily calls, track
                      customer interactions, and keep everything organised. Here's
                      what you can do:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-slate-700">
                      <li>
                        <strong>View your daily calls</strong> - See who you need
                        to call today
                      </li>
                      <li>
                        <strong>Make calls</strong> - Click the phone button to
                        start a call
                      </li>
                      <li>
                        <strong>Record outcomes</strong> - Log what happened on
                        each call
                      </li>
                      <li>
                        <strong>Schedule callbacks</strong> - Book follow-up calls
                        for later
                      </li>
                      <li>
                        <strong>Search contacts</strong> - Find any customer
                        quickly
                      </li>
                    </ul>
                  </div>
                </HelpCard>

                <HelpCard
                  title="Your Daily Workflow"
                  variant="success"
                  icon={<CheckCircle2 className="h-6 w-6" />}
                >
                  <div className="space-y-4">
                    <p className="font-medium text-emerald-800">
                      Follow these steps each day:
                    </p>
                    <ol className="list-decimal list-inside space-y-3 text-slate-700">
                      <li>
                        <strong>Log in</strong> and go to the{" "}
                        <Link
                          href="/calls"
                          className="text-blue-600 underline font-medium"
                        >
                          Calls page
                        </Link>
                      </li>
                      <li>
                        <strong>Review your scheduled calls</strong> for the day
                      </li>
                      <li>
                        <strong>Click the phone icon</strong> to start each call
                      </li>
                      <li>
                        <strong>Click "Complete"</strong> when the call is finished
                      </li>
                      <li>
                        <strong>Select the outcome</strong> that matches what
                        happened
                      </li>
                      <li>
                        <strong>Add notes</strong> about the conversation
                      </li>
                      <li>
                        <strong>Schedule a callback</strong> if needed
                      </li>
                    </ol>
                  </div>
                </HelpCard>
              </HelpCardGroup>
            </section>

            {/* Making Calls */}
            <section id="making-calls">
              <AccessibleHeading level={2} className="mb-6">
                <Phone className="inline h-8 w-8 mr-3 text-green-600" />
                Making Calls
              </AccessibleHeading>

              <HelpCardGroup>
                <HelpCard title="How to Start a Call" variant="default">
                  <div className="space-y-4">
                    <ol className="list-decimal list-inside space-y-3 text-slate-700">
                      <li>
                        Go to the <strong>Calls</strong> page from the menu
                      </li>
                      <li>
                        Find the contact you need to call in your list
                      </li>
                      <li>
                        Click the <strong>green phone button</strong> next to
                        their name
                      </li>
                      <li>
                        Your phone will dial the number automatically (if
                        connected), or you can dial it manually
                      </li>
                      <li>
                        When the call ends, click <strong>"Complete"</strong>
                      </li>
                    </ol>
                    <QuickTip variant="info">
                      If the phone button doesn't work, check that you're logged
                      into your phone system.
                    </QuickTip>
                  </div>
                </HelpCard>

                <HelpCard title="What to Do If There's No Answer" variant="warning">
                  <div className="space-y-4">
                    <p>If the customer doesn't answer:</p>
                    <ol className="list-decimal list-inside space-y-2 text-slate-700">
                      <li>Let it ring at least 5-6 times</li>
                      <li>
                        If voicemail answers, leave a message (if instructed to)
                      </li>
                      <li>Click "Complete" on the call</li>
                      <li>
                        Select <strong>"No Answer"</strong> or{" "}
                        <strong>"Voicemail"</strong> as the outcome
                      </li>
                      <li>The system will schedule a retry automatically</li>
                    </ol>
                  </div>
                </HelpCard>
              </HelpCardGroup>
            </section>

            {/* Call Outcomes - Using the comprehensive help component */}
            <section id="outcomes">
              <CallOutcomeHelp expandable={true} />
            </section>

            {/* Scheduling */}
            <section id="scheduling">
              <AccessibleHeading level={2} className="mb-6">
                <Calendar className="inline h-8 w-8 mr-3 text-purple-600" />
                Scheduling Calls
              </AccessibleHeading>

              <HelpCardGroup>
                <HelpCard title="Scheduling a New Call" variant="default">
                  <div className="space-y-4">
                    <ol className="list-decimal list-inside space-y-2 text-slate-700">
                      <li>
                        Click <strong>"Schedule Call"</strong> on the Calls page
                      </li>
                      <li>Search for and select the contact</li>
                      <li>Choose the date and time</li>
                      <li>Add any notes about why you're calling</li>
                      <li>Click "Schedule" to confirm</li>
                    </ol>
                  </div>
                </HelpCard>

                <HelpCard title="Scheduling a Callback" variant="info">
                  <div className="space-y-4">
                    <p>
                      When a customer asks you to call back later:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-slate-700">
                      <li>Complete the current call as "Callback Requested"</li>
                      <li>Select the date the customer requested</li>
                      <li>Choose an appropriate time</li>
                      <li>
                        Add notes about what they want to discuss
                      </li>
                    </ol>
                    <QuickTip>
                      Always ask the customer what time works best for them!
                    </QuickTip>
                  </div>
                </HelpCard>
              </HelpCardGroup>
            </section>

            {/* Contacts */}
            <section id="contacts">
              <AccessibleHeading level={2} className="mb-6">
                <Users className="inline h-8 w-8 mr-3 text-indigo-600" />
                Managing Contacts
              </AccessibleHeading>

              <HelpCardGroup>
                <HelpCard title="Finding a Contact" variant="default">
                  <div className="space-y-4">
                    <p>
                      You can search for any contact in the system:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-slate-700">
                      <li>
                        Go to <strong>Contacts</strong> from the menu
                      </li>
                      <li>
                        Type the person's name, phone, or email in the search box
                      </li>
                      <li>Click on their name to see full details</li>
                    </ol>
                    <QuickTip variant="info">
                      You can also search by company name to find all contacts at
                      a business.
                    </QuickTip>
                  </div>
                </HelpCard>

                <HelpCard title="Contact History" variant="default">
                  <div className="space-y-4">
                    <p>
                      Every contact shows their full history:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-slate-700">
                      <li>All previous calls and their outcomes</li>
                      <li>Notes from past conversations</li>
                      <li>Scheduled future calls</li>
                      <li>Any quotes or orders</li>
                    </ul>
                    <p className="font-medium text-slate-800">
                      Always check the history before calling so you know the
                      context!
                    </p>
                  </div>
                </HelpCard>
              </HelpCardGroup>
            </section>

            {/* Tips for Success */}
            <section id="tips">
              <AccessibleHeading level={2} className="mb-6">
                <Lightbulb className="inline h-8 w-8 mr-3 text-amber-500" />
                Tips for Success
              </AccessibleHeading>

              <HelpCardGroup>
                <HelpCard
                  title="Best Practices for Calling"
                  variant="success"
                  icon={<CheckCircle2 className="h-6 w-6" />}
                >
                  <div className="space-y-4">
                    <ul className="space-y-3 text-slate-700">
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Always check contact history</strong> before
                          calling
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Add detailed notes</strong> after every call
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Schedule callbacks</strong> at times the
                          customer requested
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Complete calls promptly</strong> - don't leave
                          them open
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Be honest with outcomes</strong> - accurate data
                          helps everyone
                        </span>
                      </li>
                    </ul>
                  </div>
                </HelpCard>

                <HelpCard
                  title="Important Rules"
                  variant="danger"
                  icon={<Shield className="h-6 w-6" />}
                >
                  <div className="space-y-4">
                    <ul className="space-y-3 text-slate-700">
                      <li className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Do Not Call requests</strong> must be recorded
                          immediately - this is a legal requirement
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Never share customer information</strong> with
                          unauthorised people
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Always add notes</strong> when marking calls as
                          Not Interested or Do Not Call
                        </span>
                      </li>
                    </ul>
                  </div>
                </HelpCard>
              </HelpCardGroup>
            </section>

            {/* Keyboard Shortcuts */}
            <section id="keyboard">
              <AccessibleHeading level={2} className="mb-6">
                <Keyboard className="inline h-8 w-8 mr-3 text-slate-600" />
                Keyboard Shortcuts
              </AccessibleHeading>

              <Card>
                <CardContent className="pt-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    {[
                      { key: "Tab", action: "Move to next item" },
                      { key: "Shift + Tab", action: "Move to previous item" },
                      { key: "Enter", action: "Click/Select item" },
                      { key: "Space", action: "Toggle checkbox/button" },
                      { key: "Escape", action: "Close dialog/popup" },
                      { key: "Arrow keys", action: "Navigate lists/menus" },
                    ].map((shortcut) => (
                      <div
                        key={shortcut.key}
                        className="flex items-center gap-4 p-3 rounded-lg bg-slate-50"
                      >
                        <kbd className="px-3 py-2 bg-white border-2 border-slate-300 rounded-lg font-mono text-base font-medium">
                          {shortcut.key}
                        </kbd>
                        <span className="text-base text-slate-700">
                          {shortcut.action}
                        </span>
                      </div>
                    ))}
                  </div>
                  <QuickTip variant="info" className="mt-6">
                    You can use the keyboard to navigate the entire system without
                    a mouse. Press Tab to move between items.
                  </QuickTip>
                </CardContent>
              </Card>
            </section>

            {/* Need More Help */}
            <section id="more-help">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-blue-100 p-4">
                      <HelpCircle className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-blue-900 mb-2">
                        Need More Help?
                      </h3>
                      <p className="text-lg text-blue-800 mb-4">
                        If you can't find what you're looking for, please contact
                        your supervisor or the IT helpdesk.
                      </p>
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2 text-blue-700">
                          <MessageSquare className="h-5 w-5" />
                          <span className="font-medium">
                            Ask your team leader
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-blue-700">
                          <Phone className="h-5 w-5" />
                          <span className="font-medium">
                            IT Helpdesk: Ext. 1234
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
