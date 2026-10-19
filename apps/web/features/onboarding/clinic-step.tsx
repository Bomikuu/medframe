import { Field, Choice } from "./field";
import type { References } from "./schema";
export function ClinicStep({ references }: { references: References }) {
  return (
    <div className="space-y-9">
      <section>
        <h2 className="mb-5 text-base font-semibold">Your clinic</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            name="name"
            label="Clinic name"
            hint="The name your team will see throughout Medframe."
            maxLength={160}
            wide
          />
          <Choice name="clinic_type" label="Clinic type" options={references.clinicTypes} />
          <Field name="email" label="Clinic contact email" type="email" maxLength={320} />
          <Field
            name="phone"
            label="Contact number"
            type="tel"
            hint="Include the country prefix, for example +63."
            maxLength={20}
          />
          <Choice
            name="country"
            label="Country"
            options={[
              { value: "PH", label: "Philippines" },
              { value: "US", label: "United States" },
              { value: "GB", label: "United Kingdom" },
              { value: "AU", label: "Australia" },
              { value: "CA", label: "Canada" },
              { value: "SG", label: "Singapore" },
              { value: "IN", label: "India" },
              { value: "", label: "Other / specify later" },
            ]}
          />
        </div>
      </section>
      <section className="border-t pt-7">
        <h2 className="mb-5 text-base font-semibold">
          Location <span className="text-xs font-normal text-muted-foreground">Optional</span>
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="region" label="Region / province" maxLength={100} />
          <Field name="city" label="City" maxLength={100} />
          <Field name="street" label="Street address" maxLength={255} wide />
          <div className="max-w-48">
            <Field name="postal_code" label="Postal code" maxLength={20} />
          </div>
          <Field
            name="description"
            label="About your clinic"
            type="textarea"
            maxLength={2000}
            wide
          />
        </div>
      </section>
    </div>
  );
}
