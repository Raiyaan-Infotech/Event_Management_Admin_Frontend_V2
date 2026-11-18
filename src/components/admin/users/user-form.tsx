"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateUser, useUpdateUser } from "@/hooks/use-users";
import { isApprovalRequired } from "@/lib/api-client";
import { useRoles } from "@/hooks/use-roles";
import { useAuth } from "@/hooks/use-auth";
import { useCountries, useStates, useCities, useLocalities } from "@/hooks/use-locations";
import { getUserRoleLevel, isDeveloper, isSuperAdmin } from "@/lib/auth-utils";
import type { User } from "@/types";

const makeEmployeeSchema = (isEditMode: boolean) =>
  z.object({
    full_name: z.string().trim().min(2, "Full name must be at least 2 characters"),
    username: z.string().optional(),
    email: z.string().trim().email("Please enter a valid email"),
    phone: z.string().trim().min(1, "Phone is required").regex(/^\+?[0-9\s\-(). ]{7,20}$/, "Please enter a valid phone number (minimum 7 digits)"),
    dob: z.string().optional(),
    gender: z.enum(["male", "female", "other"]).optional(),
    marital_status: z.enum(["married", "unmarried"]).optional(),
    country_id: z.number().optional(),
    state_id: z.number().optional(),
    city_id: z.number().optional(),
    pincode_id: z.number().optional(),
    address: z.string().optional(),
    department_id: z.number().nullable().optional(),
    department: z.string().optional(),
    designation: z.string().optional(),
    doj: z.string().optional(),
    dor: z.string().optional(),
    role_id: z.number({ required_error: "Please select a role" }),
    login_access: z.number().default(1),
    is_active: z.number().default(0),
    // Field-level required on create, optional on edit
    password: isEditMode
      ? z.string().optional()
      : z.string().min(1, "Password is required"),
    confirm_password: z.string().optional(),
  }).superRefine((data, ctx) => {
    if (data.password && data.password.length > 0) {
      if (data.password.length < 8) {
        ctx.addIssue({ code: "custom", message: "At least 8 characters required", path: ["password"] });
      }
      if (!/[A-Z]/.test(data.password)) {
        ctx.addIssue({ code: "custom", message: "Must contain at least one uppercase letter", path: ["password"] });
      }
      if (!/[a-z]/.test(data.password)) {
        ctx.addIssue({ code: "custom", message: "Must contain at least one lowercase letter", path: ["password"] });
      }
      if (!/[0-9]/.test(data.password)) {
        ctx.addIssue({ code: "custom", message: "Must contain at least one number", path: ["password"] });
      }
      if (!/[^a-zA-Z0-9]/.test(data.password)) {
        ctx.addIssue({ code: "custom", message: "Must contain at least one special character", path: ["password"] });
      }
      if (data.password !== data.confirm_password) {
        ctx.addIssue({ code: "custom", message: "Passwords do not match", path: ["confirm_password"] });
      }
    }
  });

type EmployeeFormData = z.infer<ReturnType<typeof makeEmployeeSchema>>;

interface UserFormProps {
  user?: User | null;
  onSuccess?: () => void;
}

export function UserForm({ user, onSuccess }: UserFormProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { user: currentUser } = useAuth();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const { data: rolesData } = useRoles({ limit: 100 });

  const currentUserLevel = getUserRoleLevel(currentUser);
  const targetUserLevel = user?.role?.level ?? 0;

  // Password section: superadmin/developer can always change any password;
  // others only if editing themselves or a lower-level user
  const canChangePassword =
    !user ||
    user.id === currentUser?.id ||
    isDeveloper(currentUser) ||
    isSuperAdmin(currentUser) ||
    currentUserLevel > targetUserLevel;

  const availableRoles = rolesData?.data?.filter((role) => {
    if (currentUser?.role?.slug === "developer") return true;
    if (user && role.id === user.role_id) return true; // always include user's current role
    return role.level < currentUserLevel;
  }) || [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    setError,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(makeEmployeeSchema(!!user)),
    defaultValues: {
      full_name: user?.full_name || "",
      username: user?.username || "",
      email: user?.email || "",
      phone: user?.phone || "",
      dob: user?.dob || "",
      gender: user?.gender || undefined,
      marital_status: user?.marital_status || undefined,
      country_id: user?.country_id || undefined,
      state_id: user?.state_id || undefined,
      city_id: user?.city_id || undefined,
      pincode_id: user?.pincode_id || undefined,
      address: user?.address || "",
      department_id: (user as any)?.department_id ?? null,
      department: user?.department || "",
      designation: user?.designation || "",
      doj: user?.doj || "",
      dor: user?.dor || "",
      role_id: user?.role_id || undefined,
      login_access: user?.login_access ?? 1,
      is_active: user?.is_active ?? 0,
    },
  });

  const selectedCountryId = watch("country_id");
  const selectedStateId = watch("state_id");
  const selectedCityId = watch("city_id");

  const watchedPassword = useWatch({ control, name: "password" }) ?? "";
  const watchedConfirm = useWatch({ control, name: "confirm_password" }) ?? "";
  const dojValue = watch("doj");

  const passwordRules = [
    { label: "At least 8 characters", met: watchedPassword.length >= 8 },
    { label: "At least one uppercase letter", met: /[A-Z]/.test(watchedPassword) },
    { label: "At least one lowercase letter", met: /[a-z]/.test(watchedPassword) },
    { label: "At least one number", met: /[0-9]/.test(watchedPassword) },
    { label: "At least one special character", met: /[^a-zA-Z0-9]/.test(watchedPassword) },
  ];

  // Location API hooks
  const { data: countries = [] } = useCountries();
  const { data: states = [] } = useStates(selectedCountryId || 0);
  const { data: districts = [] } = useCities(selectedStateId || 0);
  const { data: cityOptions = [] } = useLocalities(selectedCityId || 0);

  // Email uniqueness check on blur
  const [emailChecking, setEmailChecking] = useState(false);
  const checkEmailExists = async (email: string) => {
    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) return;
    // Skip check if it's the same as current user's email (edit mode)
    if (user?.email === email) return;
    setEmailChecking(true);
    try {
      const response = await (await import('@/lib/api-client')).apiClient.get('/users', { params: { search: email, limit: 5 } });
      const users: any[] = response.data?.data ?? [];
      const duplicate = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase() && u.id !== user?.id);
      if (duplicate) {
        setError('email', { type: 'manual', message: 'This email is already registered' });
      }
    } catch { /* ignore */ } finally {
      setEmailChecking(false);
    }
  };

  const [isRedirecting, setIsRedirecting] = useState(false);

  const onSubmit = async (data: EmployeeFormData) => {
    const submitData = { ...data };

    // Remove password if blank (edit mode, keep current)
    if (!submitData.password) delete submitData.password;

    const navigateToList = () => {
      setIsRedirecting(true);
      onSuccess?.() ?? router.push("/admin/platform/users");
    };

    if (user) {
      updateUserMutation.mutate({ id: user.id, data: submitData }, {
        onSuccess: navigateToList,
        onError: (error: any) => {
          setIsRedirecting(false);
          if (isApprovalRequired(error)) { navigateToList(); return; }
          const msg: string = error?.response?.data?.message || '';
          if (msg.toLowerCase().includes('email')) {
            setError('email', { type: 'manual', message: msg || 'This email is already registered' });
          }
        },
      });
    } else {
      createUserMutation.mutate(submitData as EmployeeFormData & { password: string }, {
        onSuccess: navigateToList,
        onError: (error: any) => {
          setIsRedirecting(false);
          if (isApprovalRequired(error)) { navigateToList(); return; }
          const msg: string = error?.response?.data?.message || '';
          if (msg.toLowerCase().includes('email')) {
            setError('email', { type: 'manual', message: msg || 'This email is already registered' });
          }
        },
      });
    }
  };

  const isPending = createUserMutation.isPending || updateUserMutation.isPending || isRedirecting;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
      {/* Personal Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name <span className="text-destructive">*</span></Label>
            <Input id="full_name" placeholder="Enter full name" {...register("full_name")} />
            {errors.full_name && <p className="text-sm text-destructive">{errors.full_name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" placeholder="Enter username" autoComplete="off" {...register("username")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                autoComplete="off"
                {...register("email")}
                onBlur={(e) => !user && checkEmailExists(e.target.value)}
                disabled={!!user}
                className={emailChecking ? 'pr-8' : ''}
              />
              {emailChecking && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse">checking…</span>
              )}
            </div>
            {user && <p className="text-xs text-muted-foreground">Email cannot be changed after account creation.</p>}
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Mobile <span className="text-destructive">*</span></Label>
            <Input id="phone" placeholder="Enter phone number" {...register("phone")} />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
          </div>

          <DatePicker
            label="Date of Birth"
            value={watch("dob")}
            onChange={(v) => setValue("dob", v)}
            maxDate={new Date()}
            yearRangeStart={80}
            yearRangeEnd={0}
          />

          <div className="space-y-2">
            <Label>Gender</Label>
            <Select
              value={watch("gender")}
              onValueChange={(v) => setValue("gender", v as "male" | "female" | "other")}
            >
              <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Marital Status</Label>
            <Select
              value={watch("marital_status")}
              onValueChange={(v) => setValue("marital_status", v as "married" | "unmarried")}
            >
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="married">Married</SelectItem>
                <SelectItem value="unmarried">Unmarried</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Address Section - Location Module API */}
          <div className="space-y-2">
            <Label>Country</Label>
            <Select
              value={selectedCountryId?.toString() || ""}
              onValueChange={(v) => {
                setValue("country_id", parseInt(v));
                setValue("state_id", undefined);
                setValue("city_id", undefined);
                setValue("pincode_id", undefined);
              }}
            >
              <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.id} value={country.id.toString()}>{country.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>State</Label>
            <Select
              value={selectedStateId?.toString() || ""}
              onValueChange={(v) => {
                setValue("state_id", parseInt(v));
                setValue("city_id", undefined);
                setValue("pincode_id", undefined);
              }}
              disabled={!selectedCountryId || states.length === 0}
            >
              <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
              <SelectContent>
                {states.map((state) => (
                  <SelectItem key={state.id} value={state.id.toString()}>{state.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>District</Label>
            <Select
              value={selectedCityId?.toString() || ""}
              onValueChange={(v) => {
                setValue("city_id", parseInt(v));
                setValue("pincode_id", undefined);
              }}
              disabled={!selectedStateId || districts.length === 0}
            >
              <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
              <SelectContent>
                {districts.map((d) => (
                  <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>City</Label>
            <Select
              value={watch("pincode_id")?.toString() || ""}
              onValueChange={(v) => setValue("pincode_id", parseInt(v))}
              disabled={!selectedCityId || cityOptions.length === 0}
            >
              <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
              <SelectContent>
                {cityOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" placeholder="Enter complete address" rows={2} {...register("address")} />
          </div>
        </CardContent>
      </Card>

      {/* Work Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Past Work Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="designation">Designation</Label>
            <Input id="designation" placeholder="Enter designation" {...register("designation")} />
            {errors.designation && <p className="text-sm text-destructive">{errors.designation.message}</p>}
          </div>

          <DatePicker
            label="Date of Joining (DOJ)"
            value={watch("doj")}
            onChange={(v) => setValue("doj", v, { shouldValidate: true })}
            error={errors.doj?.message}
            maxDate={new Date()}
            yearRangeStart={50}
            yearRangeEnd={0}
          />

          <DatePicker
            label="Date of Relieving (DOR)"
            value={watch("dor")}
            onChange={(v) => setValue("dor", v, { shouldValidate: true })}
            error={errors.dor?.message}
            minDate={dojValue ? parseISO(dojValue) : undefined}
            yearRangeStart={50}
            yearRangeEnd={5}
          />

          <div className="space-y-2">
            <Label>Role <span className="text-destructive">*</span></Label>
            <Select
              value={watch("role_id")?.toString()}
              onValueChange={(v) => setValue("role_id", parseInt(v))}
            >
              <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
              <SelectContent>
                {availableRoles.length > 0 ? (
                  availableRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-roles" disabled>No roles available</SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.role_id && <p className="text-sm text-destructive">{errors.role_id.message}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Account Settings */}
      {canChangePassword && <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Account Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Password Fields in Same Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">
                Password {!user && <span className="text-destructive">*</span>}
                {user && <span className="text-xs text-muted-foreground ml-1">(leave blank to keep current)</span>}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  autoComplete="new-password"
                  {...register("password")}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              {watchedPassword.length > 0 && (
                <ul className="space-y-1 pt-1">
                  {passwordRules.map((rule) => (
                    <li key={rule.label} className="flex items-center gap-2 text-xs">
                      {rule.met
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        : <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      }
                      <span className={rule.met ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                        {rule.label}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">
                Confirm Password {!user && <span className="text-destructive">*</span>}
              </Label>
              <div className="relative">
                <Input
                  id="confirm_password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  {...register("confirm_password")}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirm_password && <p className="text-sm text-destructive">{errors.confirm_password.message}</p>}
              {watchedPassword.length > 0 && watchedConfirm.length > 0 && (
                <p className={`flex items-center gap-2 text-xs ${watchedPassword === watchedConfirm ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                  {watchedPassword === watchedConfirm
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    : <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  }
                  Passwords match
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>}

      <div className="flex gap-3">
        <Button type="submit" isLoading={isPending}>
          {isPending ? "Saving..." : user ? "Update Employee" : "Create Employee"}
        </Button>
        <Button type="button" variant="outline" onClick={() => onSuccess?.() ?? router.push("/admin/platform/users")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
