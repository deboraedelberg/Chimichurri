import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiScanIcon,
  Alert02Icon,
  ArrowDataTransferHorizontalIcon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  Camera01Icon,
  Cancel01Icon,
  CheckListIcon,
  ChefHatIcon,
  CircleIcon,
  Clock01Icon,
  Copy01Icon,
  Delete02Icon,
  DragDropVerticalIcon,
  Image01Icon,
  ImageAdd01Icon,
  Link02Icon,
  Loading03Icon,
  Logout03Icon,
  Menu01Icon,
  Moon02Icon,
  MoreVerticalIcon,
  PauseIcon,
  PencilEdit01Icon,
  PlayIcon,
  PlusSignIcon,
  RotateClockwiseIcon,
  Search01Icon,
  Settings01Icon,
  Share08Icon,
  ShoppingBasket01Icon,
  SparklesIcon,
  SpoonAndForkIcon,
  Sun01Icon,
  Tick02Icon,
  UserGroupIcon,
  UserIcon,
  ZoomInAreaIcon,
  ZoomOutAreaIcon,
} from "@hugeicons/core-free-icons";

/**
 * Íconos de la app: Hugeicons envueltos con los mismos nombres que usábamos
 * de lucide-react, así el resto del código no cambia. El tamaño se controla
 * por className (h-4 w-4, etc.) igual que antes.
 */

type IconData = typeof ChefHatIcon;
type IconProps = Omit<
  React.ComponentProps<typeof HugeiconsIcon>,
  "icon" | "ref"
>;

function make(icon: IconData) {
  function Icon(props: IconProps) {
    return <HugeiconsIcon icon={icon} strokeWidth={1.8} {...props} />;
  }
  return Icon;
}

export const ChefHat = make(ChefHatIcon);
export const Clock = make(Clock01Icon);
export const Users = make(UserGroupIcon);
export const User = make(UserIcon);
export const UtensilsCrossed = make(SpoonAndForkIcon);
export const ListChecks = make(CheckListIcon);
export const LogOut = make(Logout03Icon);
export const Menu = make(Menu01Icon);
export const Plus = make(PlusSignIcon);
export const Trash2 = make(Delete02Icon);
export const GripVertical = make(DragDropVerticalIcon);
export const MoreVertical = make(MoreVerticalIcon);
export const Pencil = make(PencilEdit01Icon);
export const Share2 = make(Share08Icon);
export const Loader2 = make(Loading03Icon);
export const X = make(Cancel01Icon);
export const Check = make(Tick02Icon);
export const ChevronDown = make(ArrowDown01Icon);
export const ChevronUp = make(ArrowUp01Icon);
export const ChevronLeft = make(ArrowLeft01Icon);
export const ChevronRight = make(ArrowRight01Icon);
export const Circle = make(CircleIcon);
export const ArrowLeftRight = make(ArrowDataTransferHorizontalIcon);
export const Camera = make(Camera01Icon);
export const ImageIcon = make(Image01Icon);
export const ImagePlus = make(ImageAdd01Icon);
export const ScanText = make(AiScanIcon);
export const Link2 = make(Link02Icon);
export const ShoppingBasket = make(ShoppingBasket01Icon);
export const Copy = make(Copy01Icon);
export const Pause = make(PauseIcon);
export const Play = make(PlayIcon);
export const RotateCcw = make(RotateClockwiseIcon);
export const Search = make(Search01Icon);
export const Settings = make(Settings01Icon);
export const Sun = make(Sun01Icon);
export const Moon = make(Moon02Icon);
export const AlertTriangle = make(Alert02Icon);
export const Sparkles = make(SparklesIcon);
export const ZoomIn = make(ZoomInAreaIcon);
export const ZoomOut = make(ZoomOutAreaIcon);
