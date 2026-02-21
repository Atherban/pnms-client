// app/(staff)/sales/create.tsx
import { MaterialIcons } from "@expo/vector-icons";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import EntityThumbnail from "../../../components/ui/EntityThumbnail";
import { CustomerService } from "../../../services/customer.service";
import { InventoryService } from "../../../services/inventory.service";
import { SalesService } from "../../../services/sales.service";
import { Colors } from "../../../theme";
import { formatErrorMessage } from "../../../utils/error";
import { resolveEntityImage } from "../../../utils/image";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.75; // 75% of screen height for better visibility
const CART_FOOTER_BOTTOM_GAP = -12;

// ==================== CONSTANTS & TYPES ====================

const PAYMENT_MODES = [
  { id: "CASH", label: "Cash", icon: "payments", color: "#059669" },
  { id: "UPI", label: "UPI", icon: "qr-code", color: "#2563EB" },
  { id: "ONLINE", label: "Online", icon: "language", color: "#7C3AED" },
] as const;

type PaymentModeId = (typeof PAYMENT_MODES)[number]["id"];

interface CartItem {
  inventory: any;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  maxAvailable: number;
}

interface CreateCustomerForm {
  name: string;
  mobileNumber: string;
  address: string;
}

// ==================== UTILITY FUNCTIONS ====================

const getUnitPrice = (item: any): number => {
  if (item?.plantType?.sellingPrice) {
    return Number(item.plantType.sellingPrice);
  }
  return Number(
    item?.price ??
      item?.unitPrice ??
      item?.sellingPrice ??
      item?.priceSnapshot ??
      0,
  );
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatNumber = (num: number): string => {
  return num.toLocaleString("en-IN");
};

// ==================== BOTTOM SHEET QUANTITY SELECTOR ====================

interface QuantitySelectorModalProps {
  visible: boolean;
  onClose: () => void;
  item: any;
  onAddToCart: (item: any, quantity: number) => void;
  existingQuantity?: number;
}

const QuantitySelectorModal = ({
  visible,
  onClose,
  item,
  onAddToCart,
  existingQuantity = 0,
}: QuantitySelectorModalProps) => {
  const [quantity, setQuantity] = useState(1);
  const [inputValue, setInputValue] = useState("1");

  // Reset quantity when modal opens with new item
  useEffect(() => {
    if (item) {
      const initialQuantity = Math.max(1, existingQuantity || 1);
      setQuantity(initialQuantity);
      setInputValue(initialQuantity.toString());
    }
  }, [item, existingQuantity]);

  if (!item) return null;

  const stock = item?.quantity || 0;
  const maxSelectable = Math.max(0, stock);
  const remainingStock = Math.max(0, stock - existingQuantity);
  const unitPrice = getUnitPrice(item);
  const totalPrice = unitPrice * quantity;
  const plantName = item?.plantType?.name || "Unknown Plant";
  const category = item?.plantType?.category || "Uncategorized";
  const sellingPrice = item?.plantType?.sellingPrice || 0;
  const thumbnailUri = resolveEntityImage(item?.plantType ?? item);

  // Generate quick select options based on available stock
  const generateQuickOptions = () => {
    const options = [];

    // Add round numbers based on available stock
    if (maxSelectable >= 1) options.push(1);
    if (maxSelectable >= 2) options.push(2);
    if (maxSelectable >= 3) options.push(3);
    if (maxSelectable >= 5) options.push(5);
    if (maxSelectable >= 10) options.push(10);
    if (maxSelectable >= 25) options.push(25);
    if (maxSelectable >= 50) options.push(50);
    if (maxSelectable >= 100) options.push(100);
    if (maxSelectable >= 250) options.push(250);
    if (maxSelectable >= 500) options.push(500);

    // Add half of available stock if it's a round number and not already included
    const halfStock = Math.floor(maxSelectable / 2);
    if (
      halfStock > 10 &&
      halfStock <= maxSelectable &&
      !options.includes(halfStock)
    ) {
      options.push(halfStock);
    }

    // Add max stock
    if (maxSelectable > 0 && !options.includes(maxSelectable)) {
      options.push(maxSelectable);
    }

    return options.sort((a, b) => a - b);
  };

  const quickOptions = generateQuickOptions();

  const handleIncrement = () => {
    if (quantity < maxSelectable) {
      const newQty = quantity + 1;
      setQuantity(newQty);
      setInputValue(newQty.toString());
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      const newQty = quantity - 1;
      setQuantity(newQty);
      setInputValue(newQty.toString());
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleInputChange = (text: string) => {
    // Allow only numbers
    const numericValue = text.replace(/[^0-9]/g, "");
    setInputValue(numericValue);

    const num = parseInt(numericValue, 10);
    if (!isNaN(num) && num > 0 && num <= maxSelectable) {
      setQuantity(num);
    }
  };

  const handleQuickSelect = (qty: number) => {
    setQuantity(qty);
    setInputValue(qty.toString());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAdd = () => {
    onAddToCart(item, quantity);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Backdrop */}
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={onClose}
          />
        </View>

        {/* Bottom Sheet */}
        <View style={styles.bottomSheet}>
          {/* Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.bottomSheetContent}
            bounces={false}
          >
            {/* Header */}
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Add to Cart</Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.bottomSheetCloseButton}
              >
                <MaterialIcons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Product Info */}
            <View style={styles.bottomSheetProduct}>
              <EntityThumbnail
                uri={thumbnailUri}
                label={plantName}
                size={80}
                style={styles.bottomSheetThumbnail}
              />
              <View style={styles.bottomSheetProductDetails}>
                <Text style={styles.bottomSheetProductName}>{plantName}</Text>
                <Text style={styles.bottomSheetProductCategory}>
                  {category}
                </Text>
                <Text style={styles.bottomSheetProductPrice}>
                  {formatCurrency(sellingPrice)} each
                </Text>
              </View>
            </View>

            {/* Stock Info */}
            <View style={styles.bottomSheetStock}>
              <View style={styles.bottomSheetStockItem}>
                <Text style={styles.bottomSheetStockLabel}>Total Stock</Text>
                <Text style={styles.bottomSheetStockValue}>
                  {formatNumber(stock)}
                </Text>
              </View>
              {existingQuantity > 0 && (
                <View style={styles.bottomSheetStockItem}>
                  <Text style={styles.bottomSheetStockLabel}>In Cart</Text>
                  <Text
                    style={[
                      styles.bottomSheetStockValue,
                      { color: Colors.primary },
                    ]}
                  >
                    {formatNumber(existingQuantity)}
                  </Text>
                </View>
              )}
              <View style={styles.bottomSheetStockItem}>
                <Text style={styles.bottomSheetStockLabel}>Available</Text>
                <Text
                  style={[
                    styles.bottomSheetStockValue,
                    { color: Colors.success },
                  ]}
                >
                  {formatNumber(remainingStock)}
                </Text>
              </View>
            </View>

            {/* Quick Select - Scrollable */}
            <View style={styles.bottomSheetSection}>
              <Text style={styles.bottomSheetSectionTitle}>Quick Select</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickSelectScrollContent}
              >
                {quickOptions.map((qty) => (
                  <TouchableOpacity
                    key={qty}
                    style={[
                      styles.quickSelectPill,
                      quantity === qty && styles.quickSelectPillActive,
                    ]}
                    onPress={() => handleQuickSelect(qty)}
                  >
                    <Text
                      style={[
                        styles.quickSelectPillText,
                        quantity === qty && styles.quickSelectPillTextActive,
                      ]}
                    >
                      {formatNumber(qty)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Quantity Input */}
            <View style={styles.bottomSheetSection}>
              <Text style={styles.bottomSheetSectionTitle}>Enter Quantity</Text>
              <View style={styles.quantityInputContainer}>
                <TouchableOpacity
                  onPress={handleDecrement}
                  disabled={quantity <= 1}
                  style={[
                    styles.quantityInputButton,
                    quantity <= 1 && styles.quantityInputButtonDisabled,
                  ]}
                >
                  <MaterialIcons
                    name="remove"
                    size={24}
                    color={quantity <= 1 ? "#9CA3AF" : Colors.primary}
                  />
                </TouchableOpacity>

                <TextInput
                  style={styles.quantityInput}
                  value={inputValue}
                  onChangeText={handleInputChange}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  textAlign="center"
                  maxLength={5}
                />

                <TouchableOpacity
                  onPress={handleIncrement}
                  disabled={quantity >= maxSelectable}
                  style={[
                    styles.quantityInputButton,
                    quantity >= maxSelectable &&
                      styles.quantityInputButtonDisabled,
                  ]}
                >
                  <MaterialIcons
                    name="add"
                    size={24}
                    color={
                      quantity >= maxSelectable ? "#9CA3AF" : Colors.primary
                    }
                  />
                </TouchableOpacity>
              </View>

              {quantity === maxSelectable && maxSelectable > 0 && (
                <Text style={styles.maxStockWarning}>
                  Maximum available selected
                </Text>
              )}
            </View>

            {/* Price Summary */}
            <View style={styles.bottomSheetPriceSection}>
              <View style={styles.bottomSheetPriceRow}>
                <Text style={styles.bottomSheetPriceLabel}>Unit Price</Text>
                <Text style={styles.bottomSheetPriceValue}>
                  {formatCurrency(unitPrice)}
                </Text>
              </View>
              <View style={styles.bottomSheetPriceRow}>
                <Text style={styles.bottomSheetPriceLabel}>Quantity</Text>
                <Text style={styles.bottomSheetPriceValue}>× {quantity}</Text>
              </View>
              <View style={styles.bottomSheetPriceDivider} />
              <View style={styles.bottomSheetPriceRow}>
                <Text style={styles.bottomSheetTotalLabel}>Total</Text>
                <Text style={styles.bottomSheetTotalValue}>
                  {formatCurrency(totalPrice)}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.bottomSheetActions}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.bottomSheetCancelButton}
              >
                <Text style={styles.bottomSheetCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAdd}
                disabled={maxSelectable === 0 || quantity === 0}
                style={[
                  styles.bottomSheetAddButton,
                  (maxSelectable === 0 || quantity === 0) &&
                    styles.bottomSheetAddButtonDisabled,
                ]}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[
                    Colors.primary,
                    Colors.primaryLight || Colors.primary,
                  ]}
                  style={styles.bottomSheetAddGradient}
                >
                  <Text style={styles.bottomSheetAddButtonText}>
                    {existingQuantity > 0 ? "Update Cart" : "Add to Cart"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Extra bottom padding for scrolling */}
            <View style={{ height: 10 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ==================== INVENTORY CARD ====================

interface InventoryCardProps {
  item: any;
  onAddPress: (item: any) => void;
  cartQuantity?: number;
}

const InventoryCard = ({
  item,
  onAddPress,
  cartQuantity = 0,
}: InventoryCardProps) => {
  const plantName = item.plantType?.name || "Unknown Plant";
  const category = item.plantType?.category || "Uncategorized";
  const stock = item.quantity || 0;
  const remainingStock = Math.max(0, stock - cartQuantity);
  const sellingPrice = item.plantType?.sellingPrice || 0;
  const thumbnailUri = resolveEntityImage(item?.plantType ?? item);
  const isLowStock = remainingStock <= 5 && remainingStock > 0;
  const isOutOfStock = remainingStock <= 0;
  const isInCart = cartQuantity > 0;

  return (
    <TouchableOpacity
      onPress={() => !isOutOfStock && onAddPress(item)}
      style={[
        styles.inventoryCard,
        isOutOfStock && styles.inventoryCardOutOfStock,
        isInCart && styles.inventoryCardInCart,
      ]}
      activeOpacity={0.7}
      disabled={isOutOfStock}
    >
      <View style={styles.inventoryCardContent}>
        <EntityThumbnail
          uri={thumbnailUri}
          label={plantName}
          size={64}
          style={styles.inventoryThumbnail}
        />

        <View style={styles.inventoryInfo}>
          <View style={styles.inventoryHeader}>
            <Text style={styles.inventoryName} numberOfLines={1}>
              {plantName}
            </Text>
            {isInCart && (
              <View
                style={[
                  styles.cartBadge,
                  { backgroundColor: `${Colors.primary}10` },
                ]}
              >
                <MaterialIcons
                  name="shopping-cart"
                  size={12}
                  color={Colors.primary}
                />
                <Text style={[styles.cartBadgeText, { color: Colors.primary }]}>
                  {cartQuantity}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.inventoryCategory} numberOfLines={1}>
            {category}
          </Text>

          <View style={styles.inventoryFooter}>
            <View style={styles.inventoryStock}>
              <MaterialIcons
                name="inventory"
                size={14}
                color={
                  isOutOfStock ? "#DC2626" : isLowStock ? "#D97706" : "#059669"
                }
              />
              <Text
                style={[
                  styles.inventoryStockText,
                  isOutOfStock && { color: "#DC2626" },
                  isLowStock && !isOutOfStock && { color: "#D97706" },
                ]}
              >
                {isOutOfStock
                  ? "Out of stock"
                  : `${formatNumber(remainingStock)} available`}
              </Text>
            </View>

            <Text style={styles.inventoryPrice}>
              {sellingPrice > 0 ? formatCurrency(sellingPrice) : "—"}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ==================== CART ITEM ====================

interface CartItemProps {
  item: CartItem;
  onUpdateQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  maxQty: number;
}

const CartItemComponent = ({
  item,
  onUpdateQty,
  onRemove,
  maxQty,
}: CartItemProps) => {
  const plantName = item.inventory.plantType?.name || "Unknown Plant";
  const unitPrice = item.unitPrice;
  const thumbnailUri = resolveEntityImage(item?.inventory?.plantType ?? item?.inventory);

  return (
    <View style={styles.cartItem}>
      <View style={styles.cartItemLeft}>
        <EntityThumbnail
          uri={thumbnailUri}
          label={plantName}
          size={48}
          style={styles.cartItemThumbnail}
        />
        <View style={styles.cartItemInfo}>
          <Text style={styles.cartItemName} numberOfLines={1}>
            {plantName}
          </Text>
          <Text style={styles.cartItemPrice}>{formatCurrency(unitPrice)}</Text>
        </View>
      </View>

      <View style={styles.cartItemRight}>
        <View style={styles.quantityControl}>
          <TouchableOpacity
            onPress={() => onUpdateQty(item.inventory._id, -1)}
            style={styles.quantityButton}
            activeOpacity={0.7}
          >
            <MaterialIcons name="remove" size={18} color={Colors.primary} />
          </TouchableOpacity>

          <Text style={styles.quantityText}>{item.quantity}</Text>

          <TouchableOpacity
            onPress={() => onUpdateQty(item.inventory._id, 1)}
            disabled={item.quantity >= maxQty}
            style={[
              styles.quantityButton,
              item.quantity >= maxQty && styles.quantityButtonDisabled,
            ]}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="add"
              size={18}
              color={item.quantity >= maxQty ? "#9CA3AF" : Colors.primary}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => onRemove(item.inventory._id)}
          style={styles.cartItemRemove}
        >
          <MaterialIcons name="delete-outline" size={20} color="#DC2626" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ==================== EMPTY STATE ====================

interface EmptyStateProps {
  hasSearch: boolean;
  onClearSearch: () => void;
}

const EmptyState = ({ hasSearch, onClearSearch }: EmptyStateProps) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconContainer}>
      <LinearGradient
        colors={["#F3F4F6", "#F9FAFB"]}
        style={styles.emptyIconGradient}
      >
        <MaterialIcons
          name={hasSearch ? "search-off" : "inventory"}
          size={48}
          color="#9CA3AF"
        />
      </LinearGradient>
    </View>
    <Text style={styles.emptyTitle}>
      {hasSearch ? "No Items Found" : "No Inventory Available"}
    </Text>
    <Text style={styles.emptyMessage}>
      {hasSearch
        ? "Try adjusting your search terms"
        : "Add inventory items to start selling"}
    </Text>
    {hasSearch && (
      <TouchableOpacity onPress={onClearSearch} style={styles.emptyButton}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
          style={styles.emptyButtonGradient}
        >
          <MaterialIcons name="clear-all" size={18} color={Colors.white} />
          <Text style={styles.emptyButtonText}>Clear Search</Text>
        </LinearGradient>
      </TouchableOpacity>
    )}
  </View>
);

// ==================== LOADING STATE ====================

const LoadingState = () => (
  <View style={styles.centerContainer}>
    <ActivityIndicator size="large" color={Colors.primary} />
    <Text style={styles.loadingText}>Loading inventory...</Text>
  </View>
);

// ==================== ERROR STATE ====================

interface ErrorStateProps {
  error: any;
  onRetry: () => void;
}

const ErrorState = ({ error, onRetry }: ErrorStateProps) => (
  <View style={styles.centerContainer}>
    <View style={styles.errorIconContainer}>
      <MaterialIcons name="error-outline" size={48} color="#DC2626" />
    </View>
    <Text style={styles.errorTitle}>Failed to Load Inventory</Text>
    <Text style={styles.errorMessage}>
      {error?.message || "Please try again"}
    </Text>
    <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
        style={styles.retryGradient}
      >
        <Text style={styles.retryButtonText}>Try Again</Text>
      </LinearGradient>
    </TouchableOpacity>
  </View>
);

// ==================== MAIN COMPONENT ====================

export default function StaffSalesCreate() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  const cartFooterBottomOffset =
    (tabBarHeight > 0 ? tabBarHeight : 0) + CART_FOOTER_BOTTOM_GAP;
  const cartFooterInnerPadding =
    tabBarHeight > 0 ? 16 : Math.max(insets.bottom + 4, 16);

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<
    string | undefined
  >();
  const [selectedPayment, setSelectedPayment] = useState<PaymentModeId>("CASH");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isQuantityModalVisible, setIsQuantityModalVisible] = useState(false);
  const [isCustomerPickerVisible, setIsCustomerPickerVisible] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [isCreateCustomerVisible, setIsCreateCustomerVisible] = useState(false);
  const [customerForm, setCustomerForm] = useState<CreateCustomerForm>({
    name: "",
    mobileNumber: "",
    address: "",
  });

  // Queries
  const {
    data: inventoryData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["inventory"],
    queryFn: InventoryService.getAll,
  });

  const {
    data: customerData,
    refetch: refetchCustomers,
    isFetching: isCustomersFetching,
  } = useQuery({
    queryKey: ["customers"],
    queryFn: CustomerService.getAll,
  });

  // Memoized data
  const inventory = useMemo(() => {
    const items = Array.isArray(inventoryData) ? inventoryData : [];
    return items.filter((item: any) => item.quantity > 0);
  }, [inventoryData]);

  const customers = useMemo(
    () => (Array.isArray(customerData) ? customerData : []),
    [customerData],
  );
  const selectedCustomerName = useMemo(
    () => customers.find((c: any) => c._id === selectedCustomer)?.name,
    [customers, selectedCustomer],
  );
  const selectedCustomerInfo = useMemo(
    () => customers.find((c: any) => c._id === selectedCustomer),
    [customers, selectedCustomer],
  );
  const filteredCustomers = useMemo(() => {
    const term = customerSearch.trim().toLowerCase();
    if (!term) return customers.slice(0, 20);
    return customers
      .filter((customer: any) => {
        const name = String(customer?.name ?? "").toLowerCase();
        const mobile = String(customer?.mobileNumber ?? "").toLowerCase();
        const address = String(customer?.address ?? "").toLowerCase();
        return (
          name.includes(term) ||
          mobile.includes(term) ||
          address.includes(term)
        );
      })
      .slice(0, 100);
  }, [customerSearch, customers]);

  // Cart helpers
  const getCartQuantity = useCallback(
    (inventoryId: string) => {
      const cartItem = cart.find((item) => item.inventory._id === inventoryId);
      return cartItem?.quantity || 0;
    },
    [cart],
  );

  const getRemainingStock = useCallback(
    (item: any) => {
      const cartQty = getCartQuantity(item._id);
      return Math.max(0, (item.quantity || 0) - cartQty);
    },
    [getCartQuantity],
  );

  // Filtered inventory
  const filteredInventory = useMemo(() => {
    if (!searchQuery.trim()) {
      return inventory.filter((item: any) => getRemainingStock(item) > 0);
    }
    const term = searchQuery.toLowerCase().trim();
    return inventory.filter((item: any) => {
      const name = item.plantType?.name?.toLowerCase() ?? "";
      const category = item.plantType?.category?.toLowerCase() ?? "";
      const matchesSearch = name.includes(term) || category.includes(term);
      return matchesSearch && getRemainingStock(item) > 0;
    });
  }, [inventory, searchQuery, getRemainingStock]);

  // Cart calculations
  const cartSummary = useMemo(() => {
    let subtotal = 0;
    let totalItems = 0;
    cart.forEach((item) => {
      subtotal += item.totalPrice;
      totalItems += item.quantity;
    });
    return { subtotal, totalItems };
  }, [cart]);
  const cartFooterHeight = useMemo(() => {
    const baseHeight = 254;
    const perItemHeight = 40;
    return Math.min(400, baseHeight + cart.length * perItemHeight);
  }, [cart.length]);

  // Mutation
  const mutation = useMutation({
    mutationFn: () =>
      SalesService.create({
        customer: selectedCustomer,
        paymentMode: selectedPayment,
        items: cart.map((item) => ({
          inventoryId: item.inventory._id,
          quantity: item.quantity,
          priceAtSale: item.unitPrice,
        })),
      }),
    onSuccess: (response: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const sale = response?.data ?? response;
      Alert.alert(
        "✅ Success",
        `Sale completed! Total: ${formatCurrency(sale?.totalAmount ?? 0)}`,
        [
          {
            text: "View Bill",
            onPress: () =>
              sale?._id && router.push(`/(staff)/sales/bill/${sale._id}`),
          },
          {
            text: "View Sale",
            onPress: () =>
              sale?._id && router.push(`/(staff)/sales/${sale._id}`),
          },
          {
            text: "New Sale",
            onPress: () => {
              setCart([]);
              setSelectedCustomer(undefined);
              setSearchQuery("");
            },
          },
        ],
      );
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("❌ Error", formatErrorMessage(err));
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: (payload: { name: string; mobileNumber?: string; address?: string }) =>
      CustomerService.create(payload),
    onSuccess: async (response: any) => {
      const created = response?.data ?? response;
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      await refetchCustomers();
      const createdId = created?._id ?? created?.id;
      if (createdId) {
        setSelectedCustomer(String(createdId));
      }
      setIsCreateCustomerVisible(false);
      setIsCustomerPickerVisible(false);
      setCustomerForm({ name: "", mobileNumber: "", address: "" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Customer Added", "Customer created and selected for this sale.");
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Failed to Create Customer", formatErrorMessage(err));
    },
  });

  // Handlers
  const handleAddPress = useCallback((item: any) => {
    setSelectedItem(item);
    setIsQuantityModalVisible(true);
  }, []);

  const handleAddToCart = useCallback((item: any, quantity: number) => {
    const unitPrice = getUnitPrice(item);
    const totalPrice = unitPrice * quantity;
    setCart((prev) => {
      const existing = prev.find((i) => i.inventory._id === item._id);
      if (existing) {
        return prev.map((i) =>
          i.inventory._id === item._id
            ? {
                ...i,
                quantity,
                totalPrice: unitPrice * quantity,
              }
            : i,
        );
      }
      return [
        ...prev,
        {
          inventory: item,
          quantity,
          unitPrice,
          totalPrice,
          maxAvailable: item.quantity,
        },
      ];
    });
  }, []);

  const handleUpdateQuantity = useCallback((id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.inventory._id === id) {
            const newQuantity = Math.max(0, item.quantity + delta);
            return {
              ...item,
              quantity: newQuantity,
              totalPrice: item.unitPrice * newQuantity,
            };
          }
          return item;
        })
        .filter((item) => item.quantity > 0),
    );
  }, []);

  const handleRemoveFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((item) => item.inventory._id !== id));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleSelectCustomer = useCallback((customerId: string) => {
    setSelectedCustomer((prev) =>
      prev === customerId ? undefined : customerId,
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleOpenCustomerPicker = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCustomerSearch("");
    setIsCustomerPickerVisible(true);
  }, []);

  const handleOpenCreateCustomer = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCustomerSearch("");
    setIsCreateCustomerVisible(true);
  }, []);

  const handleCreateCustomer = useCallback(() => {
    const name = customerForm.name.trim();
    const mobileRaw = customerForm.mobileNumber.trim();
    const mobileDigits = mobileRaw.replace(/[^\d]/g, "");
    const address = customerForm.address.trim();

    if (name.length < 2) {
      Alert.alert("Validation", "Customer name must be at least 2 characters.");
      return;
    }
    if (mobileRaw && mobileDigits.length !== 10) {
      Alert.alert("Validation", "Mobile number must be exactly 10 digits.");
      return;
    }

    const hasDuplicate = customers.some((customer: any) => {
      const sameName =
        String(customer?.name ?? "").trim().toLowerCase() === name.toLowerCase();
      const sameMobile =
        mobileDigits.length === 10 &&
        String(customer?.mobileNumber ?? "").replace(/[^\d]/g, "") === mobileDigits;
      return sameName || sameMobile;
    });

    if (hasDuplicate) {
      Alert.alert(
        "Duplicate Customer",
        "A customer with same name or mobile may already exist.",
      );
      return;
    }

    createCustomerMutation.mutate({
      name,
      mobileNumber: mobileDigits || undefined,
      address: address || undefined,
    });
  }, [createCustomerMutation, customerForm, customers]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleSubmit = useCallback(() => {
    if (cart.length === 0) {
      Alert.alert("Empty Cart", "Add items to cart before creating a sale");
      return;
    }
    Alert.alert(
      "Confirm Sale",
      `${cartSummary.totalItems} items • Total ${formatCurrency(cartSummary.subtotal)}\nPayment: ${selectedPayment}`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: () => mutation.mutate() },
      ],
    );
  }, [cart, cartSummary, selectedPayment, mutation]);

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>New Sale</Text>
            <Text style={styles.headerSubtitle}>
              {cartSummary.totalItems > 0
                ? `${cartSummary.totalItems} items in cart`
                : "Select items"}
            </Text>
          </View>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      {/* Main Content */}
      <FlatList
        data={filteredInventory}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          cart.length > 0
            ? {
                paddingBottom:
                  cartFooterHeight +
                  cartFooterBottomOffset +
                  cartFooterInnerPadding +
                  24,
              }
            : {
                paddingBottom:
                  20 + cartFooterBottomOffset + cartFooterInnerPadding,
              },
        ]}
        ListHeaderComponent={
          <>
            {/* Payment Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              <View style={styles.paymentGrid}>
                {PAYMENT_MODES.map((mode) => (
                  <TouchableOpacity
                    key={mode.id}
                    onPress={() => setSelectedPayment(mode.id)}
                    style={[
                      styles.paymentOption,
                      selectedPayment === mode.id &&
                        styles.paymentOptionSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.paymentIconContainer,
                        {
                          backgroundColor:
                            selectedPayment === mode.id
                              ? `${mode.color}20`
                              : "#F3F4F6",
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={mode.icon as any}
                        size={20}
                        color={mode.color}
                      />
                    </View>
                    <Text
                      style={[
                        styles.paymentLabel,
                        selectedPayment === mode.id && { color: mode.color },
                      ]}
                    >
                      {mode.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Customer Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Customer (Optional)</Text>
              <View style={styles.customerSelectionCard}>
                <View style={styles.customerSelectionRow}>
                  <View style={styles.customerSelectionIcon}>
                    <MaterialIcons name="person" size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.customerSelectionInfo}>
                    <Text style={styles.customerSelectionLabel}>Selected Customer</Text>
                    <Text style={styles.customerSelectionValue} numberOfLines={1}>
                      {selectedCustomerInfo?.name || "Walk-in Customer"}
                    </Text>
                    {selectedCustomerInfo?.mobileNumber ? (
                      <Text style={styles.customerSelectionMeta}>
                        {selectedCustomerInfo.mobileNumber}
                      </Text>
                    ) : null}
                  </View>
                  {selectedCustomer ? (
                    <TouchableOpacity
                      onPress={() => setSelectedCustomer(undefined)}
                      style={styles.customerClearButton}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="close" size={16} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={styles.customerActionRow}>
                  <TouchableOpacity
                    onPress={handleOpenCustomerPicker}
                    style={styles.customerActionButton}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="search" size={16} color={Colors.primary} />
                    <Text style={styles.customerActionButtonText}>Choose Customer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleOpenCreateCustomer}
                    style={styles.customerActionButton}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="person-add" size={16} color={Colors.primary} />
                    <Text style={styles.customerActionButtonText}>Add Customer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Search */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Add Items</Text>
              <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={20} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search plants..."
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={handleClearSearch}>
                    <MaterialIcons name="close" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            hasSearch={searchQuery.length > 0}
            onClearSearch={handleClearSearch}
          />
        }
        renderItem={({ item }) => (
          <InventoryCard
            item={item}
            onAddPress={handleAddPress}
            cartQuantity={getCartQuantity(item._id)}
          />
        )}
      />

      {/* Cart Summary Footer */}
      {cart.length > 0 && (
        <View
          style={[
            styles.cartFooter,
            {
              bottom: cartFooterBottomOffset,
              paddingBottom: cartFooterInnerPadding,
              maxHeight: cartFooterHeight,
            },
          ]}
        >
          <View style={styles.saleMetaRow}>
            <View style={styles.saleMetaChip}>
              <MaterialIcons name="payments" size={14} color={Colors.primary} />
              <Text style={styles.saleMetaText}>{selectedPayment}</Text>
            </View>
            <View style={styles.saleMetaChip}>
              <MaterialIcons
                name="shopping-bag"
                size={14}
                color={Colors.primary}
              />
              <Text style={styles.saleMetaText}>{cart.length} items</Text>
            </View>
            <View style={styles.saleMetaChip}>
              <MaterialIcons name="person" size={14} color={Colors.primary} />
              <Text style={styles.saleMetaText}>
                {selectedCustomerName || "Walk-in"}
              </Text>
            </View>
          </View>

          <View style={styles.cartItemsSection}>
            <View style={styles.cartItemsHeader}>
              <Text style={styles.cartItemsTitle}>Selected Items</Text>
              <Text style={styles.cartItemsCount}>
                {cartSummary.totalItems} qty total
              </Text>
            </View>
            <ScrollView
              style={styles.cartItemsList}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {cart.map((cartItem) => (
                <CartItemComponent
                  key={cartItem.inventory._id}
                  item={cartItem}
                  onUpdateQty={handleUpdateQuantity}
                  onRemove={handleRemoveFromCart}
                  maxQty={Number(cartItem.inventory?.quantity || 0)}
                />
              ))}
            </ScrollView>
          </View>

          <View style={styles.cartSummary}>
            <View>
              <Text style={styles.cartSummaryLabel}>Total Items</Text>
              <Text style={styles.cartSummaryValue}>
                {cartSummary.totalItems}
              </Text>
            </View>
            <View style={styles.cartSummaryDivider} />
            <View>
              <Text style={styles.cartSummaryLabel}>Subtotal</Text>
              <Text style={styles.cartSummaryAmount}>
                {formatCurrency(cartSummary.subtotal)}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={mutation.isPending}
            style={styles.submitButton}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
              style={styles.submitGradient}
            >
              {mutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.submitText}>Confirm Sale</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Customer Picker Modal */}
      <Modal
        visible={isCustomerPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCustomerPickerVisible(false)}
      >
        <View style={styles.pickerModalContainer}>
          <TouchableOpacity
            style={styles.pickerModalBackdrop}
            activeOpacity={1}
            onPress={() => setIsCustomerPickerVisible(false)}
          />
          <View style={styles.pickerModalSheet}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Customer</Text>
              <TouchableOpacity
                onPress={() => setIsCustomerPickerVisible(false)}
                style={styles.pickerModalCloseButton}
              >
                <MaterialIcons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerSearchContainer}>
              <MaterialIcons name="search" size={18} color="#9CA3AF" />
              <TextInput
                value={customerSearch}
                onChangeText={setCustomerSearch}
                placeholder="Search by name, mobile..."
                placeholderTextColor="#9CA3AF"
                style={styles.pickerSearchInput}
              />
              {customerSearch.length > 0 ? (
                <TouchableOpacity onPress={() => setCustomerSearch("")}>
                  <MaterialIcons name="close" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity
              onPress={() => {
                setSelectedCustomer(undefined);
                setIsCustomerPickerVisible(false);
              }}
              style={styles.walkInOption}
              activeOpacity={0.8}
            >
              <MaterialIcons name="person-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.walkInOptionText}>Use Walk-in Customer</Text>
            </TouchableOpacity>

            {isCustomersFetching ? (
              <View style={styles.customerPickerLoading}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.customerPickerLoadingText}>Loading customers...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredCustomers}
                keyExtractor={(item: any) => item._id}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.pickerListContent}
                ListEmptyComponent={
                  <Text style={styles.pickerEmptyText}>No customers found.</Text>
                }
                renderItem={({ item }) => {
                  const isSelected = selectedCustomer === item._id;
                  return (
                    <TouchableOpacity
                      onPress={() => {
                        handleSelectCustomer(item._id);
                        setIsCustomerPickerVisible(false);
                      }}
                      style={[
                        styles.pickerCustomerItem,
                        isSelected && styles.pickerCustomerItemSelected,
                      ]}
                      activeOpacity={0.8}
                    >
                      <View style={styles.pickerCustomerAvatar}>
                        <Text style={styles.pickerCustomerInitial}>
                          {item?.name?.charAt(0)?.toUpperCase() || "?"}
                        </Text>
                      </View>
                      <View style={styles.pickerCustomerInfo}>
                        <Text style={styles.pickerCustomerName} numberOfLines={1}>
                          {item?.name || "Unnamed Customer"}
                        </Text>
                        <Text style={styles.pickerCustomerMeta} numberOfLines={1}>
                          {item?.mobileNumber || "No mobile"}{" "}
                          {item?.address ? `• ${item.address}` : ""}
                        </Text>
                      </View>
                      {isSelected ? (
                        <MaterialIcons name="check-circle" size={18} color={Colors.primary} />
                      ) : null}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Create Customer Modal */}
      <Modal
        visible={isCreateCustomerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCreateCustomerVisible(false)}
      >
        <View style={styles.pickerModalContainer}>
          <TouchableOpacity
            style={styles.pickerModalBackdrop}
            activeOpacity={1}
            onPress={() => setIsCreateCustomerVisible(false)}
          />
          <View style={styles.pickerModalSheet}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Add Customer</Text>
              <TouchableOpacity
                onPress={() => setIsCreateCustomerVisible(false)}
                style={styles.pickerModalCloseButton}
              >
                <MaterialIcons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.createCustomerForm}>
              <Text style={styles.createCustomerLabel}>Name *</Text>
              <TextInput
                value={customerForm.name}
                onChangeText={(text) =>
                  setCustomerForm((prev) => ({ ...prev, name: text }))
                }
                placeholder="Enter customer name"
                placeholderTextColor="#9CA3AF"
                style={styles.createCustomerInput}
              />

              <Text style={styles.createCustomerLabel}>Mobile Number</Text>
              <TextInput
                value={customerForm.mobileNumber}
                onChangeText={(text) =>
                  setCustomerForm((prev) => ({
                    ...prev,
                    mobileNumber: text.replace(/[^\d]/g, "").slice(0, 10),
                  }))
                }
                placeholder="10-digit mobile number"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                style={styles.createCustomerInput}
              />

              <Text style={styles.createCustomerLabel}>Address</Text>
              <TextInput
                value={customerForm.address}
                onChangeText={(text) =>
                  setCustomerForm((prev) => ({ ...prev, address: text }))
                }
                placeholder="Address (optional)"
                placeholderTextColor="#9CA3AF"
                style={[styles.createCustomerInput, styles.createCustomerInputMultiline]}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.createCustomerActions}>
              <TouchableOpacity
                onPress={() => setIsCreateCustomerVisible(false)}
                style={styles.createCustomerCancelButton}
              >
                <Text style={styles.createCustomerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateCustomer}
                disabled={createCustomerMutation.isPending}
                style={[
                  styles.createCustomerSubmitButton,
                  createCustomerMutation.isPending &&
                    styles.createCustomerSubmitButtonDisabled,
                ]}
              >
                {createCustomerMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.createCustomerSubmitText}>Create & Select</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Quantity Bottom Sheet */}
      <QuantitySelectorModal
        visible={isQuantityModalVisible}
        onClose={() => {
          setIsQuantityModalVisible(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        onAddToCart={handleAddToCart}
        existingQuantity={selectedItem ? getCartQuantity(selectedItem._id) : 0}
      />
    </SafeAreaView>
  );
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  // Header
  headerGradient: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },

  // List Content
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },

  // Payment
  paymentGrid: {
    flexDirection: "row",
    gap: 12,
  },
  paymentOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  paymentOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  paymentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  paymentLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },

  // Customer
  customerSelectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    gap: 12,
  },
  customerSelectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  customerSelectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${Colors.primary}10`,
  },
  customerSelectionInfo: {
    flex: 1,
    minWidth: 0,
  },
  customerSelectionLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 2,
  },
  customerSelectionValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  customerSelectionMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
  },
  customerClearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  customerActionRow: {
    flexDirection: "row",
    gap: 8,
  },
  customerActionButton: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  customerActionButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    height: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    padding: 0,
  },

  // Customer Picker + Create Customer Modal
  pickerModalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  pickerModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  pickerModalSheet: {
    maxHeight: "82%",
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  pickerModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  pickerModalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  pickerSearchContainer: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  pickerSearchInput: {
    flex: 1,
    color: "#111827",
    fontSize: 14,
    paddingVertical: 0,
  },
  walkInOption: {
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 10,
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  walkInOptionText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },
  customerPickerLoading: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  customerPickerLoadingText: {
    fontSize: 13,
    color: "#6B7280",
  },
  pickerListContent: {
    paddingBottom: 10,
  },
  pickerEmptyText: {
    textAlign: "center",
    color: "#6B7280",
    fontSize: 13,
    paddingVertical: 24,
  },
  pickerCustomerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    marginBottom: 8,
  },
  pickerCustomerItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}08`,
  },
  pickerCustomerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  pickerCustomerInitial: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
  },
  pickerCustomerInfo: {
    flex: 1,
  },
  pickerCustomerName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  pickerCustomerMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  createCustomerForm: {
    gap: 6,
    marginBottom: 14,
  },
  createCustomerLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  createCustomerInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 12,
    height: 42,
    color: "#111827",
    fontSize: 14,
  },
  createCustomerInputMultiline: {
    height: 84,
    textAlignVertical: "top",
    paddingTop: 10,
  },
  createCustomerActions: {
    flexDirection: "row",
    gap: 10,
  },
  createCustomerCancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
  },
  createCustomerCancelText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },
  createCustomerSubmitButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
  },
  createCustomerSubmitButtonDisabled: {
    opacity: 0.7,
  },
  createCustomerSubmitText: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: "700",
  },

  // Inventory Card
  inventoryCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  inventoryCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  inventoryCardInCart: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}02`,
  },
  inventoryCardOutOfStock: {
    opacity: 0.5,
    backgroundColor: "#F9FAFB",
  },
  inventoryThumbnail: {
    borderRadius: 8,
  },
  inventoryInfo: {
    flex: 1,
  },
  inventoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  inventoryName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  cartBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
    marginLeft: 8,
  },
  cartBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  inventoryCategory: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 6,
  },
  inventoryFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inventoryStock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  inventoryStockText: {
    fontSize: 12,
    color: "#6B7280",
  },
  inventoryPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#059669",
  },

  // Cart Footer
  cartFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 20,
    paddingTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  saleMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  saleMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${Colors.primary}10`,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  saleMetaText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  cartItemsSection: {
    marginBottom: 14,
  },
  cartItemsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cartItemsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  cartItemsCount: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  cartItemsList: {
    maxHeight: 150,
  },
  cartSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  cartSummaryLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  cartSummaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  cartSummaryAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.primary,
  },
  cartSummaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E5E7EB",
  },

  // Submit Button
  submitButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 4,
  },
  submitGradient: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "600",
  },

  // Bottom Sheet Modal
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#00000098",
  },
  bottomSheet: {
    height: MODAL_HEIGHT,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    shadowColor: "#00000098",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 16,
  },
  dragHandleContainer: {
    width: "100%",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
  },
  bottomSheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  bottomSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  bottomSheetCloseButton: {
    padding: 4,
  },
  bottomSheetProduct: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
  },
  bottomSheetThumbnail: {
    borderRadius: 10,
  },
  bottomSheetProductDetails: {
    flex: 1,
  },
  bottomSheetProductName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  bottomSheetProductCategory: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 6,
  },
  bottomSheetProductPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#059669",
  },
  bottomSheetStock: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
  },
  bottomSheetStockItem: {
    alignItems: "center",
  },
  bottomSheetStockLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 4,
  },
  bottomSheetStockValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  bottomSheetSection: {
    marginBottom: 24,
  },
  bottomSheetSectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  quickSelectScrollContent: {
    paddingHorizontal: 2,
    gap: 8,
  },
  quickSelectPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: Colors.white,
    marginRight: 8,
    minWidth: 60,
    alignItems: "center",
  },
  quickSelectPillActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  quickSelectPillText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  quickSelectPillTextActive: {
    color: Colors.primary,
    fontWeight: "600",
  },
  quantityInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
  },
  quantityInputButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  quantityInputButtonDisabled: {
    opacity: 0.5,
  },
  quantityInput: {
    width: 100,
    height: 48,
    fontSize: 20,
    fontWeight: "600",
    color: Colors.primary,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    backgroundColor: Colors.white,
    paddingHorizontal: 8,
  },
  maxStockWarning: {
    fontSize: 12,
    color: "#D97706",
    textAlign: "center",
    marginTop: 8,
  },
  bottomSheetPriceSection: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  bottomSheetPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  bottomSheetPriceLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  bottomSheetPriceValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#111827",
  },
  bottomSheetPriceDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  bottomSheetTotalLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  bottomSheetTotalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.primary,
  },
  bottomSheetActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  bottomSheetCancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
  },
  bottomSheetCancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
  },
  bottomSheetAddButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    overflow: "hidden",
  },
  bottomSheetAddButtonDisabled: {
    opacity: 0.5,
  },
  bottomSheetAddGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomSheetAddButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.white,
  },

  // Cart Item
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginBottom: 6,
  },
  cartItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  cartItemThumbnail: {
    borderRadius: 6,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
    marginBottom: 2,
  },
  cartItemPrice: {
    fontSize: 12,
    color: "#6B7280",
  },
  cartItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${Colors.primary}10`,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityButtonDisabled: {
    backgroundColor: "#F3F4F6",
  },
  quantityText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    minWidth: 20,
    textAlign: "center",
  },
  cartItemRemove: {
    padding: 4,
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    overflow: "hidden",
  },
  emptyIconGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  emptyMessage: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
  },
  emptyButton: {
    borderRadius: 10,
    overflow: "hidden",
  },
  emptyButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  emptyButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "600",
  },

  // Center Container
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },

  // Error
  errorIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#DC2626",
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    borderRadius: 10,
    overflow: "hidden",
  },
  retryGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
});
