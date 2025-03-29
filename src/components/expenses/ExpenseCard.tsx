import { useState } from "react";
import {
  Calendar,
  DollarSign,
  Users,
  Tag,
  Info,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Utensils,
  Car,
  Film,
  Home,
  Lightbulb,
  Plane,
  Package,
  HeartPulse,
  Camera,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Expense, Member } from "@/utils/mockData";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import ARScanDialog from "../arscan/ARScanDialogue";

interface ExpenseCardProps {
  expense: Expense;
  members: Member[];
  currentUserId?: string;
  onPaymentClick?: (expenseId: string) => void;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "food":
      return <Utensils className="h-5 w-5" />;
    case "transportation":
      return <Car className="h-5 w-5" />;
    case "entertainment":
      return <Film className="h-5 w-5" />;
    case "housing":
      return <Home className="h-5 w-5" />;
    case "utilities":
      return <Lightbulb className="h-5 w-5" />;
    case "travel":
      return <Plane className="h-5 w-5" />;
    case "shopping":
      return <ShoppingBag className="h-5 w-5" />;
    case "health":
      return <HeartPulse className="h-5 w-5" />;
    default:
      return <Package className="h-5 w-5" />;
  }
};

const formatDate = (date: Date | string | number): string => {
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }
    
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(dateObj);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid date";
  }
};

const ExpenseCard = ({
  expense,
  members,
  currentUserId = "1",
  onPaymentClick,
}: ExpenseCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [arScanOpen, setArScanOpen] = useState(false); // For AR Scan dialog

  const paidBy = members.find((member) => member.id === expense.paidBy);
  const userSplit = expense.splits.find((split) => split.memberId === currentUserId);
  const isUserPayer = expense.paidBy === currentUserId;

  const getUserStatus = () => {
    if (isUserPayer) {
      return `You paid ${formatCurrency(expense.amount, expense.currency)}`;
    } else if (userSplit) {
      return userSplit.paid
        ? `You paid your share of ${formatCurrency(userSplit.amount, expense.currency)}`
        : `You owe ${formatCurrency(userSplit.amount, expense.currency)}`;
    }
    return null;
  };

  const userStatus = getUserStatus();

  return (
    <>
      {/* Main card container */}
      <div
        className="
          bg-white 
          rounded-md 
          shadow 
          transition-shadow 
          p-4 
          mb-4 
          hover:shadow-lg
        "
      >
        {/* Top Row */}
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary">
              {getCategoryIcon(expense.category)}
            </div>
            <div className="space-y-1">
              <h3 className="font-medium text-lg leading-none">{expense.name}</h3>
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="mr-1 h-3 w-3" />
                <span>{formatDate(expense.date)}</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="font-semibold">
              {formatCurrency(expense.amount, expense.currency)}
            </div>
            {userStatus && (
              <div
                className={`text-sm ${
                  isUserPayer
                    ? "text-green-600"
                    : userSplit?.paid
                    ? "text-green-600"
                    : "text-amber-600"
                }`}
              >
                {userStatus}
              </div>
            )}
          </div>
        </div>

        {/* Middle Row */}
        <div className="mt-3 flex items-center text-sm text-muted-foreground">
          <div className="flex items-center">
            <DollarSign className="mr-1 h-3 w-3" />
            <span>Paid by </span>
            {paidBy && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="ml-1 font-medium text-foreground">
                      {paidBy.id === currentUserId ? "You" : paidBy.name}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{paidBy.email}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <span className="mx-2">•</span>

          <div className="flex items-center">
            <Tag className="mr-1 h-3 w-3" />
            <span className="capitalize">{expense.category}</span>
          </div>

          <span className="mx-2">•</span>

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center hover:text-foreground"
          >
            <Info className="mr-1 h-3 w-3" />
            <span>Details</span>
            {expanded ? (
              <ChevronUp className="ml-1 h-3 w-3" />
            ) : (
              <ChevronDown className="ml-1 h-3 w-3" />
            )}
          </button>

          {/* AR Scan Button (optional position) */}
          <span className="mx-2">•</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setArScanOpen(true)}
            className="h-7 px-2 text-xs"
          >
            <Camera className="mr-1 h-3 w-3" />
            AR Scan
          </Button>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-4 animate-slide-down">
            <Separator className="my-3" />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Split between</span>
                <Badge variant="outline" className="capitalize">
                  <Users className="mr-1 h-3 w-3" />
                  <span>{expense.splits.length} people</span>
                </Badge>
              </div>

              <div className="flex -space-x-2 overflow-hidden">
                {members
                  .filter((member) =>
                    expense.splits.some((split) => split.memberId === member.id)
                  )
                  .map((member) => (
                    <TooltipProvider key={member.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Avatar className="border-2 border-background">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
              </div>

              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium">Split Details</h4>

                <div className="space-y-1.5">
                  {expense.splits.map((split) => {
                    const member = members.find((m) => m.id === split.memberId);
                    if (!member) return null;

                    return (
                      <div
                        key={split.memberId}
                        className="flex justify-between items-center text-sm py-1"
                      >
                        <div className="flex items-center">
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                          </Avatar>
                          <span>
                            {member.id === currentUserId ? "You" : member.name}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span
                            className={split.paid ? "text-green-600" : "text-amber-600"}
                          >
                            {formatCurrency(split.amount, expense.currency)}
                          </span>
                          {!split.paid &&
                            member.id === currentUserId &&
                            onPaymentClick && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="ml-2 h-7 px-2 text-xs"
                                onClick={() => onPaymentClick(expense.id)}
                              >
                                Pay Now
                              </Button>
                            )}
                          {(split.paid ||
                            !onPaymentClick ||
                            member.id !== currentUserId) && (
                            <Badge
                              variant={split.paid ? "secondary" : "outline"}
                              className="ml-2 text-xs"
                            >
                              {split.paid ? "Paid" : "Pending"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {expense.description && (
                  <div className="mt-3 text-sm">
                    <h4 className="font-medium">Description</h4>
                    <p className="text-muted-foreground mt-1">{expense.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AR Scan Dialog */}
      <ARScanDialog isOpen={arScanOpen} onClose={() => setArScanOpen(false)} />
    </>
  );
};

export default ExpenseCard;
