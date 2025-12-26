'use client';

import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, Eye, EyeOff } from 'lucide-react';

type CourseBuilderProps = {
  initialData?: any;
  onDataChange?: (data: any) => void;
};

// Memoized input components to prevent re-renders and focus loss
const InputField = memo(({ label, value, onChange, placeholder = '', required = false, type = 'text' }: any) => (
  <div className="space-y-2">
    <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">
      {label} {required && <span className="text-red-600">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
    />
  </div>
));
InputField.displayName = 'InputField';

const TextareaField = memo(({ label, value, onChange, placeholder = '', rows = 3 }: any) => (
  <div className="space-y-2">
    <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">{label}</label>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent resize-none"
    />
  </div>
));
TextareaField.displayName = 'TextareaField';

export default function CourseBuilder({ initialData, onDataChange }: CourseBuilderProps) {
  // Section visibility toggles
  const [sections, setSections] = useState({
    hero: initialData?.hero ? true : false,
    benefits: initialData?.benefits ? true : false,
    curriculum: initialData?.curriculum ? true : false,
    logistics: initialData?.logistics ? true : false,
    outcomes: initialData?.outcomes ? true : false,
    pricing: initialData?.pricing ? true : false,
    commitment: initialData?.commitment ? true : false,
    donation: initialData?.donation ? true : false,
    form: initialData?.form ? true : true,
  });

  // Expanded sections
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    hero: true,
    benefits: true,
    curriculum: true,
    logistics: true,
    outcomes: true,
    pricing: true,
    commitment: true,
    donation: false,
    form: true,
  });

  // Course data
  const [courseData, setCourseData] = useState({
    hero: initialData?.hero || {
      badge: '',
      subtitle: '',
      description: '',
    },
    benefits: initialData?.benefits || [],
    curriculum: initialData?.curriculum || {
      label: '',
      description: '',
      items: [],
    },
    logistics: initialData?.logistics || {
      startDate: '',
      schedule: '',
      scheduleDetail: '',
      duration: '',
      hours: '',
      modality: '',
      tools: '',
      capacity: null,
    },
    outcomes: initialData?.outcomes || {
      label: '',
      description: '',
      items: [],
    },
    pricing: initialData?.pricing || {
      isFree: false,
      amount: 0,
      currency: 'USD',
      discountPrice: null,
      badge: '',
    },
    commitment: initialData?.commitment || {
      title: '',
      checkboxLabel: '',
      amountSuggestion: '',
      note: '',
    },
    donation: initialData?.donation || {
      label: '',
      text: '',
      link: '',
      linkText: '',
    },
    form: initialData?.form || {
      enabled: true,
      endpoint: '',
      fields: [],
      requiresTerms: true,
      requiresCommitment: false,
    },
  });

  // Propagate changes to parent with useEffect to avoid re-renders during typing
  useEffect(() => {
    if (onDataChange) {
      const filtered: any = {};
      Object.keys(sections).forEach(key => {
        if (sections[key as keyof typeof sections]) {
          filtered[key] = courseData[key as keyof typeof courseData];
        }
      });
      onDataChange(filtered);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseData, sections]);

  const updateCourseData = useCallback((section: string, data: any) => {
    setCourseData(prev => ({ ...prev, [section]: data }));
  }, []);

  // Stable update functions for each section to prevent re-renders
  const updateHeroField = useCallback((field: string, value: any) => {
    setCourseData(prev => ({
      ...prev,
      hero: { ...prev.hero, [field]: value }
    }));
  }, []);

  const updateCurriculumField = useCallback((field: string, value: any) => {
    setCourseData(prev => ({
      ...prev,
      curriculum: { ...prev.curriculum, [field]: value }
    }));
  }, []);

  const updateLogisticsField = useCallback((field: string, value: any) => {
    setCourseData(prev => ({
      ...prev,
      logistics: { ...prev.logistics, [field]: value }
    }));
  }, []);

  const updateOutcomesField = useCallback((field: string, value: any) => {
    setCourseData(prev => ({
      ...prev,
      outcomes: { ...prev.outcomes, [field]: value }
    }));
  }, []);

  const updatePricingField = useCallback((field: string, value: any) => {
    setCourseData(prev => ({
      ...prev,
      pricing: { ...prev.pricing, [field]: value }
    }));
  }, []);

  const updateCommitmentField = useCallback((field: string, value: any) => {
    setCourseData(prev => ({
      ...prev,
      commitment: { ...prev.commitment, [field]: value }
    }));
  }, []);

  const updateDonationField = useCallback((field: string, value: any) => {
    setCourseData(prev => ({
      ...prev,
      donation: { ...prev.donation, [field]: value }
    }));
  }, []);

  const updateFormField = useCallback((field: string, value: any) => {
    setCourseData(prev => ({
      ...prev,
      form: { ...prev.form, [field]: value }
    }));
  }, []);

  // Create memoized onChange handlers for each field to prevent re-renders
  const heroHandlers = useMemo(() => ({
    badge: (value: string) => updateHeroField('badge', value),
    subtitle: (value: string) => updateHeroField('subtitle', value),
    description: (value: string) => updateHeroField('description', value),
  }), [updateHeroField]);

  const curriculumHandlers = useMemo(() => ({
    label: (value: string) => updateCurriculumField('label', value),
    description: (value: string) => updateCurriculumField('description', value),
  }), [updateCurriculumField]);

  const logisticsHandlers = useMemo(() => ({
    startDate: (value: string) => updateLogisticsField('startDate', value),
    schedule: (value: string) => updateLogisticsField('schedule', value),
    scheduleDetail: (value: string) => updateLogisticsField('scheduleDetail', value),
    duration: (value: string) => updateLogisticsField('duration', value),
    hours: (value: string) => updateLogisticsField('hours', value),
    modality: (value: string) => updateLogisticsField('modality', value),
    tools: (value: string) => updateLogisticsField('tools', value),
  }), [updateLogisticsField]);

  const outcomesHandlers = useMemo(() => ({
    label: (value: string) => updateOutcomesField('label', value),
    description: (value: string) => updateOutcomesField('description', value),
  }), [updateOutcomesField]);

  const pricingHandlers = useMemo(() => ({
    isFree: (value: boolean) => updatePricingField('isFree', value),
    amount: (value: number) => updatePricingField('amount', value),
    currency: (value: string) => updatePricingField('currency', value),
    discountPrice: (value: number | null) => updatePricingField('discountPrice', value),
    badge: (value: string) => updatePricingField('badge', value),
  }), [updatePricingField]);

  const commitmentHandlers = useMemo(() => ({
    title: (value: string) => updateCommitmentField('title', value),
    checkboxLabel: (value: string) => updateCommitmentField('checkboxLabel', value),
    amountSuggestion: (value: string) => updateCommitmentField('amountSuggestion', value),
    note: (value: string) => updateCommitmentField('note', value),
  }), [updateCommitmentField]);

  const donationHandlers = useMemo(() => ({
    label: (value: string) => updateDonationField('label', value),
    text: (value: string) => updateDonationField('text', value),
    link: (value: string) => updateDonationField('link', value),
    linkText: (value: string) => updateDonationField('linkText', value),
  }), [updateDonationField]);

  const formHandlers = useMemo(() => ({
    enabled: (value: boolean) => updateFormField('enabled', value),
    endpoint: (value: string) => updateFormField('endpoint', value),
    requiresTerms: (value: boolean) => updateFormField('requiresTerms', value),
    requiresCommitment: (value: boolean) => updateFormField('requiresCommitment', value),
  }), [updateFormField]);

  const toggleSection = (section: keyof typeof sections) => {
    setSections({ ...sections, [section]: !sections[section] });
  };

  const toggleExpanded = (section: string) => {
    setExpanded({ ...expanded, [section]: !expanded[section] });
  };

  // Helper components
  const SectionHeader = ({ title, section, icon }: { title: string; section: keyof typeof sections; icon?: string }) => (
    <div className="flex items-center justify-between p-4 bg-white/50 rounded-lg border border-gray-200 mb-4">
      <div className="flex items-center gap-3">
        {icon && <span className="text-2xl">{icon}</span>}
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => toggleSection(section)}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            sections[section]
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-gray-200 text-gray-700 border border-gray-300'
          }`}
        >
          {sections[section] ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        {sections[section] && (
          <button
            type="button"
            onClick={() => toggleExpanded(section)}
            className="p-1 text-gray-600 hover:text-gray-900"
          >
            {expanded[section] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div>
        <SectionHeader title="Hero Section" section="hero" icon="🎯" />
        {sections.hero && expanded.hero && (
          <div className="space-y-4 p-4 bg-white/30 rounded-lg">
            <InputField
              label="Badge"
              value={courseData.hero.badge}
              onChange={heroHandlers.badge}
              placeholder="NEW COURSE"
            />
            <TextareaField
              label="Subtitle"
              value={courseData.hero.subtitle}
              onChange={heroHandlers.subtitle}
              placeholder="Stop trading time for repetitive tasks..."
            />
            <TextareaField
              label="Description"
              value={courseData.hero.description}
              onChange={heroHandlers.description}
              placeholder="This course teaches you..."
            />
          </div>
        )}
      </div>

      {/* Benefits Section */}
      <div>
        <SectionHeader title="Benefits" section="benefits" icon="✨" />
        {sections.benefits && expanded.benefits && (
          <div className="space-y-4 p-4 bg-white/30 rounded-lg">
            {courseData.benefits.map((benefit: any, index: number) => (
              <div key={index} className="p-4 bg-gray-100/50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-sm font-bold text-gray-600">Benefit {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = courseData.benefits.filter((_: any, i: number) => i !== index);
                      updateCourseData('benefits', updated);
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <InputField
                    label="Icon (emoji)"
                    value={benefit.icon}
                    onChange={(val: string) => {
                      const updated = [...courseData.benefits];
                      updated[index] = { ...updated[index], icon: val };
                      updateCourseData('benefits', updated);
                    }}
                    placeholder="🤖"
                  />
                  <InputField
                    label="Title"
                    value={benefit.title}
                    onChange={(val: string) => {
                      const updated = [...courseData.benefits];
                      updated[index] = { ...updated[index], title: val };
                      updateCourseData('benefits', updated);
                    }}
                  />
                  <TextareaField
                    label="Description"
                    value={benefit.description}
                    onChange={(val: string) => {
                      const updated = [...courseData.benefits];
                      updated[index] = { ...updated[index], description: val };
                      updateCourseData('benefits', updated);
                    }}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                updateCourseData('benefits', [
                  ...courseData.benefits,
                  { icon: '', title: '', description: '' },
                ]);
              }}
              className="w-full py-3 bg-[#10b981] text-white font-medium rounded-lg hover:bg-[#059669] transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Benefit
            </button>
          </div>
        )}
      </div>

      {/* Curriculum Section */}
      <div>
        <SectionHeader title="Curriculum" section="curriculum" icon="📚" />
        {sections.curriculum && expanded.curriculum && (
          <div className="space-y-4 p-4 bg-white/30 rounded-lg">
            <InputField
              label="Section Label"
              value={courseData.curriculum.label}
              onChange={(val: string) => updateCourseData('curriculum', { ...courseData.curriculum, label: val })}
              placeholder="COURSE CURRICULUM"
            />
            <InputField
              label="Description"
              value={courseData.curriculum.description}
              onChange={(val: string) => updateCourseData('curriculum', { ...courseData.curriculum, description: val })}
              placeholder="2 modules of practical training"
            />
            <div className="space-y-4 mt-4">
              <label className="block text-sm font-bold text-gray-700">Curriculum Items</label>
              {courseData.curriculum.items.map((item: any, index: number) => (
                <div key={index} className="p-4 bg-gray-100/50 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-bold text-gray-600">Module {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = courseData.curriculum.items.filter((_: any, i: number) => i !== index);
                        updateCourseData('curriculum', { ...courseData.curriculum, items: updated });
                      }}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <InputField
                      label="Title"
                      value={item.title}
                      onChange={(val: string) => {
                        const updated = [...courseData.curriculum.items];
                        updated[index] = { ...updated[index], title: val };
                        updateCourseData('curriculum', { ...courseData.curriculum, items: updated });
                      }}
                    />
                    <TextareaField
                      label="Description"
                      value={item.description}
                      onChange={(val: string) => {
                        const updated = [...courseData.curriculum.items];
                        updated[index] = { ...updated[index], description: val };
                        updateCourseData('curriculum', { ...courseData.curriculum, items: updated });
                      }}
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  updateCourseData('curriculum', {
                    ...courseData.curriculum,
                    items: [...courseData.curriculum.items, { title: '', description: '' }],
                  });
                }}
                className="w-full py-3 bg-[#10b981] text-white font-medium rounded-lg hover:bg-[#059669] transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Module
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Logistics Section */}
      <div>
        <SectionHeader title="Logistics" section="logistics" icon="📅" />
        {sections.logistics && expanded.logistics && (
          <div className="space-y-4 p-4 bg-white/30 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="Start Date"
                value={courseData.logistics.startDate}
                onChange={(val: string) => updateCourseData('logistics', { ...courseData.logistics, startDate: val })}
                placeholder="January 2026"
              />
              <InputField
                label="Schedule"
                value={courseData.logistics.schedule}
                onChange={(val: string) => updateCourseData('logistics', { ...courseData.logistics, schedule: val })}
                placeholder="Tuesdays & Thursdays"
              />
            </div>
            <InputField
              label="Schedule Detail"
              value={courseData.logistics.scheduleDetail}
              onChange={(val: string) => updateCourseData('logistics', { ...courseData.logistics, scheduleDetail: val })}
              placeholder="7:00 PM - 9:00 PM EST"
            />
            <div className="grid grid-cols-3 gap-4">
              <InputField
                label="Duration"
                value={courseData.logistics.duration}
                onChange={(val: string) => updateCourseData('logistics', { ...courseData.logistics, duration: val })}
                placeholder="4 weeks"
              />
              <InputField
                label="Total Hours"
                value={courseData.logistics.hours}
                onChange={(val: string) => updateCourseData('logistics', { ...courseData.logistics, hours: val })}
                placeholder="16 hours total"
              />
              <InputField
                label="Modality"
                value={courseData.logistics.modality}
                onChange={(val: string) => updateCourseData('logistics', { ...courseData.logistics, modality: val })}
                placeholder="Virtual (Zoom)"
              />
            </div>
            <InputField
              label="Tools/Requirements"
              value={courseData.logistics.tools}
              onChange={(val: string) => updateCourseData('logistics', { ...courseData.logistics, tools: val })}
              placeholder="Make.com, OpenAI API"
            />

            {/* Capacity */}
            <div className="mt-6 p-4 bg-gray-100/50 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-bold text-gray-700">Limited Capacity</label>
                <button
                  type="button"
                  onClick={() => {
                    updateCourseData('logistics', {
                      ...courseData.logistics,
                      capacity: courseData.logistics.capacity ? null : { number: '', reason: '', waitlistText: '' },
                    });
                  }}
                  className={`px-3 py-1 rounded text-xs font-medium ${
                    courseData.logistics.capacity ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-600'
                  }`}
                >
                  {courseData.logistics.capacity ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              {courseData.logistics.capacity && (
                <div className="space-y-3">
                  <InputField
                    label="Seats (e.g., 38/50 seats)"
                    value={courseData.logistics.capacity.number}
                    onChange={(val: string) =>
                      updateCourseData('logistics', {
                        ...courseData.logistics,
                        capacity: { ...courseData.logistics.capacity, number: val },
                      })
                    }
                  />
                  <TextareaField
                    label="Reason for Limit"
                    value={courseData.logistics.capacity.reason}
                    onChange={(val: string) =>
                      updateCourseData('logistics', {
                        ...courseData.logistics,
                        capacity: { ...courseData.logistics.capacity, reason: val },
                      })
                    }
                  />
                  <InputField
                    label="Waitlist Text"
                    value={courseData.logistics.capacity.waitlistText}
                    onChange={(val: string) =>
                      updateCourseData('logistics', {
                        ...courseData.logistics,
                        capacity: { ...courseData.logistics.capacity, waitlistText: val },
                      })
                    }
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Outcomes Section */}
      <div>
        <SectionHeader title="Learning Outcomes" section="outcomes" icon="🎯" />
        {sections.outcomes && expanded.outcomes && (
          <div className="space-y-4 p-4 bg-white/30 rounded-lg">
            <InputField
              label="Section Label"
              value={courseData.outcomes.label}
              onChange={(val: string) => updateCourseData('outcomes', { ...courseData.outcomes, label: val })}
              placeholder="WHAT YOU'LL LEARN"
            />
            <InputField
              label="Description"
              value={courseData.outcomes.description}
              onChange={(val: string) => updateCourseData('outcomes', { ...courseData.outcomes, description: val })}
              placeholder="By the end of this course:"
            />
            <div className="space-y-3 mt-4">
              <label className="block text-sm font-bold text-gray-700">Outcomes</label>
              {courseData.outcomes.items.map((item: string, index: number) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const updated = [...courseData.outcomes.items];
                      updated[index] = e.target.value;
                      updateCourseData('outcomes', { ...courseData.outcomes, items: updated });
                    }}
                    className="flex-1 px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-emerald-500"
                    placeholder="Build autonomous systems that work 24/7"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = courseData.outcomes.items.filter((_: string, i: number) => i !== index);
                      updateCourseData('outcomes', { ...courseData.outcomes, items: updated });
                    }}
                    className="px-3 py-2 bg-red-900/50 text-red-400 rounded-lg hover:bg-red-900"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  updateCourseData('outcomes', { ...courseData.outcomes, items: [...courseData.outcomes.items, ''] });
                }}
                className="w-full py-3 bg-[#10b981] text-white font-medium rounded-lg hover:bg-[#059669] transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Outcome
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pricing Section */}
      <div>
        <SectionHeader title="Pricing" section="pricing" icon="💰" />
        {sections.pricing && expanded.pricing && (
          <div className="space-y-4 p-4 bg-white/30 rounded-lg">
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={courseData.pricing.isFree}
                  onChange={(e) => updateCourseData('pricing', { ...courseData.pricing, isFree: e.target.checked })}
                  className="accent-emerald-500"
                />
                <span className="text-sm text-gray-700">Free Course</span>
              </label>
            </div>
            {!courseData.pricing.isFree && (
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Amount"
                  type="number"
                  value={courseData.pricing.amount}
                  onChange={(val: string) => updateCourseData('pricing', { ...courseData.pricing, amount: parseInt(val) || 0 })}
                  placeholder="149"
                />
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Currency</label>
                  <select
                    value={courseData.pricing.currency}
                    onChange={(e) => updateCourseData('pricing', { ...courseData.pricing, currency: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
            )}
            <InputField
              label="Discount Price (optional)"
              type="number"
              value={courseData.pricing.discountPrice || ''}
              onChange={(val: string) => updateCourseData('pricing', { ...courseData.pricing, discountPrice: val ? parseInt(val) : null })}
              placeholder="99"
            />
            <InputField
              label="Badge (optional)"
              value={courseData.pricing.badge}
              onChange={(val: string) => updateCourseData('pricing', { ...courseData.pricing, badge: val })}
              placeholder="Early Bird Offer"
            />
          </div>
        )}
      </div>

      {/* Commitment Section */}
      <div>
        <SectionHeader title="Commitment" section="commitment" icon="🤝" />
        {sections.commitment && expanded.commitment && (
          <div className="space-y-4 p-4 bg-white/30 rounded-lg">
            <InputField
              label="Title"
              value={courseData.commitment.title}
              onChange={(val: string) => updateCourseData('commitment', { ...courseData.commitment, title: val })}
              placeholder="Honor Commitment"
            />
            <TextareaField
              label="Checkbox Label"
              value={courseData.commitment.checkboxLabel}
              onChange={(val: string) => updateCourseData('commitment', { ...courseData.commitment, checkboxLabel: val })}
              placeholder="I commit to completing the course..."
            />
            <InputField
              label="Amount Suggestion"
              value={courseData.commitment.amountSuggestion}
              onChange={(val: string) => updateCourseData('commitment', { ...courseData.commitment, amountSuggestion: val })}
              placeholder="Suggested contribution: $99"
            />
            <TextareaField
              label="Note"
              value={courseData.commitment.note}
              onChange={(val: string) => updateCourseData('commitment', { ...courseData.commitment, note: val })}
              placeholder="Your commitment helps us..."
            />
          </div>
        )}
      </div>

      {/* Donation Section */}
      <div>
        <SectionHeader title="Donation" section="donation" icon="💚" />
        {sections.donation && expanded.donation && (
          <div className="space-y-4 p-4 bg-white/30 rounded-lg">
            <InputField
              label="Label"
              value={courseData.donation.label}
              onChange={(val: string) => updateCourseData('donation', { ...courseData.donation, label: val })}
              placeholder="Support This Course"
            />
            <TextareaField
              label="Text"
              value={courseData.donation.text}
              onChange={(val: string) => updateCourseData('donation', { ...courseData.donation, text: val })}
              placeholder="Your donation helps us..."
            />
            <InputField
              label="Link"
              value={courseData.donation.link}
              onChange={(val: string) => updateCourseData('donation', { ...courseData.donation, link: val })}
              placeholder="https://donate.example.com"
            />
            <InputField
              label="Link Text"
              value={courseData.donation.linkText}
              onChange={(val: string) => updateCourseData('donation', { ...courseData.donation, linkText: val })}
              placeholder="Make a Donation"
            />
          </div>
        )}
      </div>

      {/* Form Section */}
      <div>
        <SectionHeader title="Registration Form" section="form" icon="📝" />
        {sections.form && expanded.form && (
          <div className="space-y-4 p-4 bg-white/30 rounded-lg">
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={courseData.form.enabled}
                  onChange={(e) => updateCourseData('form', { ...courseData.form, enabled: e.target.checked })}
                  className="accent-emerald-500"
                />
                <span className="text-sm text-gray-700">Enable Registration Form</span>
              </label>
            </div>
            {courseData.form.enabled && (
              <>
                <InputField
                  label="API Endpoint"
                  value={courseData.form.endpoint}
                  onChange={(val: string) => updateCourseData('form', { ...courseData.form, endpoint: val })}
                  placeholder="/api/courses/my-course/signup"
                />

                {/* Form Fields */}
                <div className="space-y-4 mt-6">
                  <label className="block text-sm font-bold text-gray-700">Form Fields</label>
                  {courseData.form.fields.map((field: any, index: number) => (
                    <div key={index} className="p-4 bg-gray-100/50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-sm font-bold text-gray-600">Field {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = courseData.form.fields.filter((_: any, i: number) => i !== index);
                            updateCourseData('form', { ...courseData.form, fields: updated });
                          }}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <InputField
                          label="Name"
                          value={field.name}
                          onChange={(val: string) => {
                            const updated = [...courseData.form.fields];
                            updated[index] = { ...updated[index], name: val };
                            updateCourseData('form', { ...courseData.form, fields: updated });
                          }}
                          placeholder="firstName"
                        />
                        <InputField
                          label="Label"
                          value={field.label}
                          onChange={(val: string) => {
                            const updated = [...courseData.form.fields];
                            updated[index] = { ...updated[index], label: val };
                            updateCourseData('form', { ...courseData.form, fields: updated });
                          }}
                          placeholder="First Name"
                        />
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">Type</label>
                          <select
                            value={field.type}
                            onChange={(e) => {
                              const updated = [...courseData.form.fields];
                              updated[index] = { ...updated[index], type: e.target.value };
                              updateCourseData('form', { ...courseData.form, fields: updated });
                            }}
                            className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-emerald-500"
                          >
                            <option value="text">Text</option>
                            <option value="email">Email</option>
                            <option value="number">Number</option>
                            <option value="tel">Phone</option>
                            <option value="select">Select</option>
                            <option value="textarea">Textarea</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.required ?? true}
                              onChange={(e) => {
                                const updated = [...courseData.form.fields];
                                updated[index] = { ...updated[index], required: e.target.checked };
                                updateCourseData('form', { ...courseData.form, fields: updated });
                              }}
                              className="accent-emerald-500"
                            />
                            <span className="text-sm text-gray-700">Required</span>
                          </label>
                        </div>
                        <div className="col-span-2">
                          <InputField
                            label="Placeholder"
                            value={field.placeholder || ''}
                            onChange={(val: string) => {
                              const updated = [...courseData.form.fields];
                              updated[index] = { ...updated[index], placeholder: val };
                              updateCourseData('form', { ...courseData.form, fields: updated });
                            }}
                            placeholder="Enter placeholder text..."
                          />
                        </div>
                        {field.type === 'select' && (
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Options (comma-separated)</label>
                            <input
                              type="text"
                              value={field.options?.join(', ') || ''}
                              onChange={(e) => {
                                const updated = [...courseData.form.fields];
                                updated[index] = {
                                  ...updated[index],
                                  options: e.target.value.split(',').map((opt: string) => opt.trim()),
                                };
                                updateCourseData('form', { ...courseData.form, fields: updated });
                              }}
                              placeholder="Option 1, Option 2, Option 3"
                              className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      updateCourseData('form', {
                        ...courseData.form,
                        fields: [
                          ...courseData.form.fields,
                          { name: '', label: '', type: 'text', required: true, placeholder: '' },
                        ],
                      });
                    }}
                    className="w-full py-3 bg-[#10b981] text-white font-medium rounded-lg hover:bg-[#059669] transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Field
                  </button>
                </div>

                <div className="flex gap-4 mt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={courseData.form.requiresTerms}
                      onChange={(e) => updateCourseData('form', { ...courseData.form, requiresTerms: e.target.checked })}
                      className="accent-emerald-500"
                    />
                    <span className="text-sm text-gray-700">Requires Terms Acceptance</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={courseData.form.requiresCommitment}
                      onChange={(e) => updateCourseData('form', { ...courseData.form, requiresCommitment: e.target.checked })}
                      className="accent-emerald-500"
                    />
                    <span className="text-sm text-gray-700">Requires Commitment</span>
                  </label>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
