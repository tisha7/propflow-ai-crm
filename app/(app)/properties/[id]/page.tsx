"use client";

import Image from "next/image";
import {
  ArrowLeft,
  Pencil,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type Property = {
  id: string;
  organization_id: string;
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
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
}

function formatPrice(property: Property) {
  return `${property.currency} ${Number(
    property.price,
  ).toLocaleString()}`;
}

function getStorageFilePath(
  publicUrl: string | null,
) {
  if (!publicUrl) {
    return null;
  }

  const marker =
    "/storage/v1/object/public/property-images/";

  const index = publicUrl.indexOf(marker);

  if (index === -1) {
    return null;
  }

  return decodeURIComponent(
    publicUrl.slice(index + marker.length),
  );
}

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);
  const propertyId = params.id;

  const [property, setProperty] =
    useState<Property | null>(null);

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingImage, setUploadingImage] =
    useState(false);

  const [deleteModalOpen, setDeleteModalOpen] =
    useState(false);

  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [propertyType, setPropertyType] =
    useState("Apartment");
  const [status, setStatus] =
    useState("available");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [area, setArea] = useState("");
  const [areaUnit, setAreaUnit] =
    useState("sq ft");

  const [selectedImage, setSelectedImage] =
    useState<File | null>(null);

  const [imagePreview, setImagePreview] =
    useState<string | null>(null);

  const populateForm = useCallback(
    (value: Property) => {
      setTitle(value.title);
      setDescription(value.description ?? "");
      setPropertyType(value.property_type);
      setStatus(value.status);
      setPrice(String(value.price));
      setCurrency(value.currency);
      setLocation(value.location);
      setAddress(value.address ?? "");

      setBedrooms(
        value.bedrooms != null
          ? String(value.bedrooms)
          : "",
      );

      setBathrooms(
        value.bathrooms != null
          ? String(value.bathrooms)
          : "",
      );

      setArea(
        value.area != null
          ? String(value.area)
          : "",
      );

      setAreaUnit(
        value.area_unit ?? "sq ft",
      );
    },
    [],
  );

  const loadProperty = useCallback(
    async () => {
      setLoading(true);
      setError("");

      const { data, error: fetchError } =
        await supabase
          .from("properties")
          .select(
            `
              id,
              organization_id,
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
          .eq("id", propertyId)
          .single();

      if (fetchError) {
        setProperty(null);
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      const loadedProperty =
        data as Property;

      setProperty(loadedProperty);
      populateForm(loadedProperty);
      setLoading(false);
    },
    [
      populateForm,
      propertyId,
      supabase,
    ],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProperty();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadProperty]);

  function handleImageChange(
    file: File | null,
  ) {
    if (!file) {
      setSelectedImage(null);

      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }

      setImagePreview(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError(
        "Please select an image file.",
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Image size must be 5MB or less.",
      );
      return;
    }

    setError("");

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(file);
    setImagePreview(
      URL.createObjectURL(file),
    );
  }

  async function uploadPropertyImage(
    file: File,
    organizationId: string,
  ) {
    const extension =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase() || "jpg";

    const safeBaseName =
      file.name
        .replace(/\.[^/.]+$/, "")
        .replace(
          /[^a-zA-Z0-9-_]/g,
          "-",
        )
        .replace(/-+/g, "-")
        .toLowerCase()
        .slice(0, 60) || "property";

    const fileName =
      `${Date.now()}-${safeBaseName}.${extension}`;

    const filePath =
      `${organizationId}/${fileName}`;

    const { error: uploadError } =
      await supabase.storage
        .from("property-images")
        .upload(
          filePath,
          file,
          {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          },
        );

    if (uploadError) {
      throw new Error(
        uploadError.message,
      );
    }

    const { data } =
      supabase.storage
        .from("property-images")
        .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function deleteStorageFile(
    publicUrl: string | null,
  ) {
    const filePath =
      getStorageFilePath(publicUrl);

    if (!filePath) {
      return;
    }

    try {
      await supabase.storage
        .from("property-images")
        .remove([filePath]);
    } catch {
      // Storage cleanup failure should not block the main operation.
    }
  }

  async function handleSave(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!property) {
      setError(
        "Property information is unavailable.",
      );
      return;
    }

    const currentProperty = property;

    const trimmedTitle = title.trim();
    const trimmedLocation =
      location.trim();

    if (!trimmedTitle) {
      setError(
        "Property title is required.",
      );
      return;
    }

    if (!trimmedLocation) {
      setError(
        "Property location is required.",
      );
      return;
    }

    if (!price || Number(price) < 0) {
      setError(
        "Please enter a valid property price.",
      );
      return;
    }

    setSaving(true);
    setError("");

    let nextImageUrl =
      currentProperty.image_url;

    try {
      if (selectedImage) {
        setUploadingImage(true);

        nextImageUrl =
          await uploadPropertyImage(
            selectedImage,
            currentProperty.organization_id,
          );

        setUploadingImage(false);
      }

      const { data, error: updateError } =
        await supabase
          .from("properties")
          .update({
            title: trimmedTitle,
            description:
              description.trim() || null,
            property_type:
              propertyType.trim() || "Other",
            status,
            price: Number(price),
            currency:
              currency.trim() || "USD",
            location: trimmedLocation,
            address:
              address.trim() || null,
            bedrooms: bedrooms
              ? Number(bedrooms)
              : null,
            bathrooms: bathrooms
              ? Number(bathrooms)
              : null,
            area: area
              ? Number(area)
              : null,
            area_unit:
              areaUnit.trim() ||
              "sq ft",
            image_url: nextImageUrl,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", propertyId)
          .select(
            `
              id,
              organization_id,
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

      if (updateError) {
        if (
          selectedImage &&
          nextImageUrl !==
            currentProperty.image_url
        ) {
          await deleteStorageFile(
            nextImageUrl,
          );
        }

        setError(updateError.message);
        return;
      }

      const updatedProperty =
        data as Property;

      setProperty(updatedProperty);
      populateForm(updatedProperty);
      setEditing(false);

      if (imagePreview) {
        URL.revokeObjectURL(
          imagePreview,
        );
      }

      setImagePreview(null);
      setSelectedImage(null);

      if (
        selectedImage &&
        currentProperty.image_url &&
        currentProperty.image_url !==
          updatedProperty.image_url
      ) {
        await deleteStorageFile(
          currentProperty.image_url,
        );
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Something went wrong while saving the property.",
      );
    } finally {
      setUploadingImage(false);
      setSaving(false);
    }
  }

  function cancelEditing() {
    if (!property) {
      return;
    }

    populateForm(property);

    if (imagePreview) {
      URL.revokeObjectURL(
        imagePreview,
      );
    }

    setImagePreview(null);
    setSelectedImage(null);
    setError("");
    setEditing(false);
  }

  async function handleDelete() {
    if (!property) {
      return;
    }

    setDeleting(true);
    setError("");

    const oldImageUrl =
      property.image_url;

    const { error: deleteError } =
      await supabase
        .from("properties")
        .delete()
        .eq("id", propertyId);

    if (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
      return;
    }

    if (oldImageUrl) {
      await deleteStorageFile(
        oldImageUrl,
      );
    }

    setDeleteModalOpen(false);
    setDeleting(false);

    router.replace("/properties");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-ink-400">
        Loading property...
      </div>
    );
  }

  if (!property) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() =>
            router.push("/properties")
          }
          className="inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-900"
        >
          <ArrowLeft className="size-4" />
          Back to properties
        </button>

        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error || "Property not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <button
            type="button"
            onClick={() =>
              router.push("/properties")
            }
            className="mb-3 inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-900"
          >
            <ArrowLeft className="size-4" />
            Back to properties
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
              {property.title}
            </h1>

            <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium">
              {formatLabel(
                property.status,
              )}
            </span>

            <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium">
              {property.property_type}
            </span>
          </div>

          <p className="mt-1 text-sm text-ink-400">
            Property details, availability,
            pricing, and location.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!editing ? (
            <button
              type="button"
              onClick={() => {
                setError("");
                setEditing(true);
              }}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-ink-900 px-4 text-sm font-medium text-white hover:opacity-90"
            >
              <Pencil className="size-4" />
              Edit property
            </button>
          ) : null}

          <button
            type="button"
            onClick={() =>
              setDeleteModalOpen(true)
            }
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            <Trash2 className="size-4" />
            Delete
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {editing ? (
        <form
          onSubmit={handleSave}
          className="rounded-xl border border-border bg-surface p-5"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Title"
              value={title}
              onChange={setTitle}
              required
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
            />

            <Field
              label="Currency"
              value={currency}
              onChange={setCurrency}
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
            />

            <Field
              label="Address"
              value={address}
              onChange={setAddress}
            />

            <Field
              label="Bedrooms"
              type="number"
              value={bedrooms}
              onChange={setBedrooms}
            />

            <Field
              label="Bathrooms"
              type="number"
              value={bathrooms}
              onChange={setBathrooms}
            />

            <Field
              label="Area"
              type="number"
              value={area}
              onChange={setArea}
            />

            <Field
              label="Area unit"
              value={areaUnit}
              onChange={setAreaUnit}
            />
          </div>

          <div className="mt-5 space-y-2">
            <label
              htmlFor="replace-property-image"
              className="text-sm font-medium text-ink-800"
            >
              Property image
            </label>

            <div className="rounded-xl border border-dashed border-border bg-surface-sunken p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-ink-700 hover:bg-background">
                  <Upload className="size-4" />
                  Replace image

                  <input
                    id="replace-property-image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) =>
                      handleImageChange(
                        event.target.files?.[0] ||
                          null,
                      )
                    }
                  />
                </label>

                <span className="text-xs text-ink-400">
                  JPG, PNG, WEBP • Maximum 5MB
                </span>
              </div>

              {imagePreview ? (
                <div className="mt-4 flex items-center gap-4">
                  <div
                    className="size-24 shrink-0 rounded-lg bg-cover bg-center bg-no-repeat"
                    style={{
                      backgroundImage: `url("${imagePreview}")`,
                    }}
                    role="img"
                    aria-label="New property preview"
                  />

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-800">
                      {selectedImage?.name}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        handleImageChange(null)
                      }
                      className="mt-1 text-xs text-red-600 hover:underline"
                    >
                      Remove new image
                    </button>
                  </div>
                </div>
              ) : property.image_url ? (
                <div className="mt-4 text-xs text-ink-400">
                  Current image will remain until
                  you upload a replacement.
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-5 space-y-2">
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
                setDescription(
                  event.target.value,
                )
              }
              rows={6}
              className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2"
            />
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={cancelEditing}
              disabled={
                saving || uploadingImage
              }
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-ink-700 hover:bg-surface-sunken disabled:opacity-50"
            >
              <X className="size-4" />
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                saving || uploadingImage
              }
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-ink-900 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="size-4" />

              {uploadingImage
                ? "Uploading image..."
                : saving
                  ? "Saving..."
                  : "Save changes"}
            </button>
          </div>
        </form>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="overflow-hidden rounded-xl border border-border bg-surface lg:col-span-2">
            {property.image_url ? (
              <div className="relative aspect-[16/9] w-full bg-surface-sunken">
                <Image
                  src={property.image_url}
                  alt={property.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  className="object-cover"
                  unoptimized
                  loader={({ src }) => src}
                />
              </div>
            ) : (
              <div className="flex aspect-[16/9] items-center justify-center bg-surface-sunken text-sm text-ink-400">
                No property image
              </div>
            )}

            <div className="p-5">
              <h2 className="text-lg font-semibold text-ink-900">
                {property.title}
              </h2>

              <p className="mt-1 text-sm text-ink-400">
                {property.location}
                {property.address
                  ? ` • ${property.address}`
                  : ""}
              </p>

              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-ink-600">
                {property.description ||
                  "No description added yet."}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <InfoCard title="Pricing">
              <InfoRow
                label="Price"
                value={formatPrice(property)}
              />

              <InfoRow
                label="Status"
                value={formatLabel(
                  property.status,
                )}
              />
            </InfoCard>

            <InfoCard title="Property facts">
              <InfoRow
                label="Type"
                value={property.property_type}
              />

              <InfoRow
                label="Bedrooms"
                value={
                  property.bedrooms != null
                    ? String(
                        property.bedrooms,
                      )
                    : "—"
                }
              />

              <InfoRow
                label="Bathrooms"
                value={
                  property.bathrooms != null
                    ? String(
                        property.bathrooms,
                      )
                    : "—"
                }
              />

              <InfoRow
                label="Area"
                value={
                  property.area != null
                    ? `${Number(
                        property.area,
                      ).toLocaleString()} ${
                        property.area_unit ||
                        ""
                      }`.trim()
                    : "—"
                }
              />
            </InfoCard>
          </div>

          <div className="lg:col-span-3">
            <InfoCard title="Location">
              <InfoRow
                label="Location"
                value={property.location}
              />

              <InfoRow
                label="Address"
                value={
                  property.address || "—"
                }
              />
            </InfoCard>
          </div>

          <div className="lg:col-span-3">
            <InfoCard title="Timeline">
              <InfoRow
                label="Created"
                value={formatDate(
                  property.created_at,
                )}
              />

              <InfoRow
                label="Last updated"
                value={formatDate(
                  property.updated_at,
                )}
              />
            </InfoCard>
          </div>
        </div>
      )}

      {deleteModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
            <h2 className="text-base font-semibold text-ink-900">
              Delete property
            </h2>

            <p className="mt-2 text-sm leading-6 text-ink-500">
              Are you sure you want to delete{" "}
              <span className="font-medium text-ink-900">
                {property.title}
              </span>
              ? This action cannot be undone.
            </p>

            {error ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setError("");
                }}
                disabled={deleting}
                className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-ink-700 hover:bg-surface-sunken disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="size-4" />
                {deleting
                  ? "Deleting..."
                  : "Delete"}
              </button>
            </div>
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

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-4 text-sm font-semibold text-ink-900">
        {title}
      </h2>

      <div className="space-y-3">
        {children}
      </div>
    </section>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-ink-400">
        {label}
      </span>

      <span className="max-w-[65%] text-right text-sm font-medium text-ink-800">
        {value}
      </span>
    </div>
  );
}