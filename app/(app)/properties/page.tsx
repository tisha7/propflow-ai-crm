"use client";

import Image from "next/image";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Plus, Search, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Property = {
  id: string;
  title: string;
  description: string | null;
  property_type: string;
  status: string;
  price: number;
  currency: string;
  location: string;
  address: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  area_unit: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_OPTIONS = [
  "available",
  "reserved",
  "sold",
  "off_market",
] as const;

const PROPERTY_TYPE_OPTIONS = [
  "Apartment",
  "House",
  "Villa",
  "Condo",
  "Townhouse",
  "Land",
  "Commercial",
  "Office",
  "Other",
] as const;

function formatLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatPrice(property: Property) {
  return `${property.currency} ${Number(
    property.price,
  ).toLocaleString()}`;
}

export default function PropertiesPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [propertyType, setPropertyType] = useState("Apartment");
  const [status, setStatus] = useState("available");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [area, setArea] = useState("");
  const [areaUnit, setAreaUnit] = useState("sq ft");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const loadProperties = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("properties")
      .select(
        `
          id,
          title,
          description,
          property_type,
          status,
          price,
          currency,
          location,
          address,
          bedrooms,
          bathrooms,
          area,
          area_unit,
          image_url,
          created_at,
          updated_at
        `,
      )
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setProperties([]);
    } else {
      setProperties((data ?? []) as Property[]);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProperties();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadProperties]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setPropertyType("Apartment");
    setStatus("available");
    setPrice("");
    setCurrency("USD");
    setLocation("");
    setAddress("");
    setBedrooms("");
    setBathrooms("");
    setArea("");
    setAreaUnit("sq ft");
    setImageFile(null);

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImagePreview(null);
    setError("");
  }

  function handleImageChange(file: File | null) {
    if (!file) {
      setImageFile(null);

      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }

      setImagePreview(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be 5MB or less.");
      return;
    }

    setError("");

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function uploadPropertyImage(
    file: File,
    organizationId: string,
  ) {
    const extension =
      file.name.split(".").pop()?.toLowerCase() || "jpg";

    const safeBaseName =
      file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9-_]/g, "-")
        .replace(/-+/g, "-")
        .toLowerCase()
        .slice(0, 60) || "property";

    const fileName = `${Date.now()}-${safeBaseName}.${extension}`;
    const filePath = `${organizationId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("property-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from("property-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function handleCreateProperty(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedLocation = location.trim();

    if (!trimmedTitle) {
      setError("Property title is required.");
      return;
    }

    if (!price || Number(price) < 0) {
      setError("Please enter a valid property price.");
      return;
    }

    if (!trimmedLocation) {
      setError("Property location is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Your session has expired. Please sign in again.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.organization_id) {
        setError("Unable to resolve your organization.");
        return;
      }

      let uploadedImageUrl: string | null = null;

      if (imageFile) {
        uploadedImageUrl = await uploadPropertyImage(
          imageFile,
          profile.organization_id,
        );
      }

      const { data, error: insertError } = await supabase
        .from("properties")
        .insert({
          organization_id: profile.organization_id,
          title: trimmedTitle,
          description: description.trim() || null,
          property_type: propertyType,
          status,
          price: Number(price),
          currency: currency.trim() || "USD",
          location: trimmedLocation,
          address: address.trim() || null,
          bedrooms: bedrooms ? Number(bedrooms) : null,
          bathrooms: bathrooms ? Number(bathrooms) : null,
          area: area ? Number(area) : null,
          area_unit: areaUnit.trim() || "sq ft",
          image_url: uploadedImageUrl,
        })
        .select(
          `
            id,
            title,
            description,
            property_type,
            status,
            price,
            currency,
            location,
            address,
            bedrooms,
            bathrooms,
            area,
            area_unit,
            image_url,
            created_at,
            updated_at
          `,
        )
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      if (data) {
        setProperties((current) => [
          data as Property,
          ...current,
        ]);
      }

      resetForm();
      setModalOpen(false);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Something went wrong while creating the property.",
      );
    } finally {
      setSaving(false);
    }
  }

  const filteredProperties = properties.filter((property) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      property.title.toLowerCase().includes(query) ||
      property.location.toLowerCase().includes(query) ||
      property.address?.toLowerCase().includes(query) ||
      property.property_type.toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === "all" ||
      property.status === statusFilter;

    const matchesType =
      typeFilter === "all" ||
      property.property_type.toLowerCase() ===
        typeFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesType;
  });

  const propertyTypes = Array.from(
    new Set(
      properties.map(
        (property) => property.property_type,
      ),
    ),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            Properties
          </h1>

          <p className="mt-1 text-sm text-ink-400">
            Manage your property inventory, pricing,
            availability, and locations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetForm();
            setModalOpen(true);
          }}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-ink-900 px-4 text-sm font-medium text-white transition hover:opacity-90"
        >
          <Plus className="size-4" />
          Add property
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search properties..."
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none"
        >
          <option value="all">All statuses</option>

          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {formatLabel(option)}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(event) =>
            setTypeFilter(event.target.value)
          }
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none"
        >
          <option value="all">All types</option>

          {propertyTypes.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {error && !modalOpen ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-400">
            Loading properties...
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="p-10 text-center">
            <h3 className="text-sm font-medium text-ink-900">
              No properties found
            </h3>

            <p className="mt-1 text-sm text-ink-400">
              Add your first property or change your filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px]">
              <thead className="border-b border-border bg-surface-sunken">
                <tr className="text-left text-xs font-medium text-ink-400">
                  <th className="px-4 py-3">Property</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Beds</th>
                  <th className="px-4 py-3">Baths</th>
                  <th className="px-4 py-3">Area</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {filteredProperties.map((property) => (
                  <tr
                    key={property.id}
                    className="text-sm hover:bg-surface-sunken/50"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-surface-sunken">
                          {property.image_url ? (
                            <Image
                              src={property.image_url}
                              alt={property.title}
                              fill
                              sizes="48px"
                              className="object-cover"
                              unoptimized
                              loader={({ src }) => src}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-ink-400">
                              No image
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/properties/${property.id}`,
                              )
                            }
                            className="block max-w-[320px] truncate text-left font-medium text-ink-900 hover:underline"
                          >
                            {property.title}
                          </button>

                          <div className="mt-1 truncate text-xs text-ink-400">
                            {property.address ||
                              property.location}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-ink-600">
                      {property.property_type}
                    </td>

                    <td className="px-4 py-4 font-medium text-ink-800">
                      {formatPrice(property)}
                    </td>

                    <td className="px-4 py-4 text-ink-600">
                      {property.location}
                    </td>

                    <td className="px-4 py-4 text-ink-600">
                      {property.bedrooms ?? "—"}
                    </td>

                    <td className="px-4 py-4 text-ink-600">
                      {property.bathrooms ?? "—"}
                    </td>

                    <td className="px-4 py-4 text-ink-600">
                      {property.area != null
                        ? `${Number(
                            property.area,
                          ).toLocaleString()} ${
                            property.area_unit || ""
                          }`.trim()
                        : "—"}
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium">
                        {formatLabel(property.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-ink-900">
                  Add property
                </h2>

                <p className="mt-1 text-xs text-ink-400">
                  Add a property to your organization inventory.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!saving) {
                    resetForm();
                    setModalOpen(false);
                  }
                }}
                className="flex size-8 items-center justify-center rounded-lg text-ink-500 hover:bg-surface-sunken"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <form
              onSubmit={handleCreateProperty}
              className="max-h-[80vh] space-y-5 overflow-y-auto p-5"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Title"
                  value={title}
                  onChange={setTitle}
                  required
                  placeholder="Luxury 3 Bedroom Apartment"
                />

                <SelectField
                  label="Property type"
                  value={propertyType}
                  onChange={setPropertyType}
                  options={PROPERTY_TYPE_OPTIONS}
                />

                <Field
                  label="Price"
                  type="number"
                  value={price}
                  onChange={setPrice}
                  required
                  placeholder="500000"
                />

                <Field
                  label="Currency"
                  value={currency}
                  onChange={setCurrency}
                  placeholder="USD"
                />

                <SelectField
                  label="Status"
                  value={status}
                  onChange={setStatus}
                  options={STATUS_OPTIONS}
                />

                <Field
                  label="Location"
                  value={location}
                  onChange={setLocation}
                  required
                  placeholder="Downtown"
                />

                <Field
                  label="Address"
                  value={address}
                  onChange={setAddress}
                  placeholder="123 Main Street"
                />

                <Field
                  label="Bedrooms"
                  type="number"
                  value={bedrooms}
                  onChange={setBedrooms}
                  placeholder="3"
                />

                <Field
                  label="Bathrooms"
                  type="number"
                  value={bathrooms}
                  onChange={setBathrooms}
                  placeholder="2"
                />

                <Field
                  label="Area"
                  type="number"
                  value={area}
                  onChange={setArea}
                  placeholder="1800"
                />

                <Field
                  label="Area unit"
                  value={areaUnit}
                  onChange={setAreaUnit}
                  placeholder="sq ft"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="property-image"
                  className="text-sm font-medium text-ink-800"
                >
                  Property image
                </label>

                <div className="rounded-xl border border-dashed border-border bg-surface-sunken p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-ink-700 hover:bg-background">
                      <Upload className="size-4" />
                      Choose image

                      <input
                        id="property-image"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) =>
                          handleImageChange(
                            event.target.files?.[0] || null,
                          )
                        }
                      />
                    </label>

                    <div className="text-xs text-ink-400">
                      JPG, PNG, WEBP • Maximum 5MB
                    </div>
                  </div>

                  {imagePreview ? (
                    <div className="mt-4 flex items-center gap-4">
                      <div
                        className="size-24 shrink-0 rounded-lg bg-cover bg-center bg-no-repeat"
                        style={{
                          backgroundImage: `url("${imagePreview}")`,
                        }}
                        role="img"
                        aria-label="Selected property preview"
                      />

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-800">
                          {imageFile?.name}
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            handleImageChange(null)
                          }
                          className="mt-1 text-xs text-red-600 hover:underline"
                        >
                          Remove image
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="property-description"
                  className="text-sm font-medium text-ink-800"
                >
                  Description
                </label>

                <textarea
                  id="property-description"
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  rows={5}
                  placeholder="Describe the property..."
                  className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2"
                />
              </div>

              {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (!saving) {
                      resetForm();
                      setModalOpen(false);
                    }
                  }}
                  disabled={saving}
                  className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-ink-700 hover:bg-surface-sunken disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-ink-900 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus className="size-4" />
                  {saving
                    ? "Uploading..."
                    : "Create property"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-ink-800">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        required={required}
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-ink-800">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none"
      >
        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {formatLabel(option)}
          </option>
        ))}
      </select>
    </div>
  );
}