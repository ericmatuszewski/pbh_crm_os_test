"use client";

import { Quote } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Trash2, Download, Send } from "lucide-react";
import { QuoteStatusBadge } from "./QuoteStatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

interface QuoteTableProps {
  quotes: Quote[];
  onEdit?: (quote: Quote) => void;
  onDelete?: (quote: Quote) => void;
  onSend?: (quote: Quote) => void;
  onDownload?: (quote: Quote) => void;
}

export function QuoteTable({
  quotes,
  onEdit,
  onDelete,
  onSend,
  onDownload,
}: QuoteTableProps) {
  return (
    <div className="rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Quote #</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Client</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Valid Until</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotes.map((quote) => (
            <TableRow key={quote.id}>
              <TableCell>
                <Link
                  href={`/quotes/${quote.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {quote.quoteNumber}
                </Link>
              </TableCell>
              <TableCell>
                <span className="font-medium">{quote.title}</span>
              </TableCell>
              <TableCell>
                {quote.contact ? (
                  <div>
                    <div className="font-medium">
                      {quote.contact.firstName} {quote.contact.lastName}
                    </div>
                    {quote.company && (
                      <div className="text-sm text-muted-foreground">
                        {quote.company.name}
                      </div>
                    )}
                  </div>
                ) : quote.company ? (
                  <span>{quote.company.name}</span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(quote.total, quote.currency)}
              </TableCell>
              <TableCell>
                <QuoteStatusBadge status={quote.status} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(quote.validUntil)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(quote.createdAt)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/quotes/${quote.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDownload?.(quote)}>
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </DropdownMenuItem>
                    {quote.status === "DRAFT" && (
                      <DropdownMenuItem onClick={() => onSend?.(quote)}>
                        <Send className="mr-2 h-4 w-4" />
                        Mark as Sent
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onEdit?.(quote)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDelete?.(quote)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
