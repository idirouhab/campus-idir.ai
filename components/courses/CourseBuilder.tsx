'use client';

import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import {
    ChevronDown, ChevronUp, Plus, Trash2, Eye, EyeOff,
    Rocket, Sparkles, Target, Zap, Code, Database,
    Clock, CheckCircle, Award, BookOpen, Users, TrendingUp,
    Lightbulb, Shield, Heart, Star, Cpu, Globe,
    BarChart, MessageSquare, Settings, Search, LucideIcon,
    Brain, BrainCircuit, Blocks, Puzzle, Wand2, Package,
    Layers, Component, Layout, Grid, Briefcase, GraduationCap,
    Trophy, Medal, Flame, ThumbsUp, HandMetal, Smile, Workflow,
    GitBranch, ShieldCheck
} from 'lucide-react';

type CourseBuilderProps = {
  initialData?: any;
  onDataChange?: (data: any) => void;
  visibleSections?: Array<
    'hero' | 'benefits' | 'curriculum' | 'logistics' | 'outcomes' | 'pricing' | 'commitment' | 'donation' | 'form'
  >;
  advancedSections?: Array<
    'hero' | 'benefits' | 'curriculum' | 'logistics' | 'outcomes' | 'pricing' | 'commitment' | 'donation' | 'form'
  >;
  showAdvancedToggle?: boolean;
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

// Available icons for benefits
const AVAILABLE_ICONS: Record<string, LucideIcon> = {
  // Action & Progress
  Rocket,
  Target,
  Zap,
  TrendingUp,
  Trophy,
  Medal,
  Flame,
  ThumbsUp,

  // Learning & Knowledge
  Brain,
  BrainCircuit,
  Lightbulb,
  BookOpen,
  GraduationCap,

  // Technology & Code
  Code,
  Cpu,
  Database,
  Globe,
  Settings,

  // No-Code & Visual
  Blocks,
  Puzzle,
  Wand2,
  Package,
  Layers,
  Component,
  Layout,
  Grid,
  Workflow,
  GitBranch,

  // People & Collaboration
  Users,
  Briefcase,
  HandMetal,
  Smile,

  // Quality & Features
  Sparkles,
  CheckCircle,
  Award,
  Shield,
  Heart,
  Star,
  ShieldCheck,

  // Tools & Search
  BarChart,
  MessageSquare,
  Search,
  Clock,
};

const FORM_LABELS: Record<string, string> = {
  'form.firstName': 'First Name',
  'form.lastName': 'Last Name',
  'form.email': 'Email',
  'form.country': 'Country',
  'form.birthYear': 'Birth Year',
};

// Icon Picker Component
const IconPicker = memo(({ value, onChange }: { value: string; onChange: (icon: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);

  const SelectedIcon = value && AVAILABLE_ICONS[value] ? AVAILABLE_ICONS[value] : Sparkles;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">Icon</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent flex items-center gap-3 hover:bg-gray-200 transition-colors"
        >
          <SelectedIcon className="w-5 h-5 text-[#10b981]" />
          <span className="text-sm">{value || 'Select an icon'}</span>
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-h-64 overflow-y-auto">
            <div className="grid grid-cols-6 gap-2">
              {Object.entries(AVAILABLE_ICONS).map(([name, Icon]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    onChange(name);
                    setIsOpen(false);
                  }}
                  className={`p-3 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center ${
                    value === name ? 'bg-[#10b981]/20 ring-2 ring-[#10b981]' : ''
                  }`}
                  title={name}
                >
                  <Icon className={`w-5 h-5 ${value === name ? 'text-[#10b981]' : 'text-gray-600'}`} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
IconPicker.displayName = 'IconPicker';

// Export icon renderer for use in course display pages
export const BenefitIcon = ({ iconName, className = 'w-6 h-6' }: { iconName: string; className?: string }) => {
  const Icon = AVAILABLE_ICONS[iconName] || Sparkles;
  return <Icon className={className} />;
};

export default function CourseBuilder({
  initialData,
  onDataChange,
  visibleSections,
  advancedSections,
  showAdvancedToggle = true,
}: CourseBuilderProps) {
  // Section visibility toggles
  const [sections, setSections] = useState(() => {
    const base = {
      hero: initialData?.hero ? true : false,
      benefits: initialData?.benefits ? true : false,
      curriculum: initialData?.curriculum ? true : false,
      logistics: initialData?.logistics ? true : false,
      outcomes: initialData?.outcomes ? true : false,
      pricing: initialData?.pricing ? true : false,
      commitment: initialData?.commitment ? true : false,
      donation: initialData?.donation ? true : false,
      form: initialData?.form ? true : true,
    };
    if (visibleSections && visibleSections.length > 0) {
      (Object.keys(base) as Array<keyof typeof base>).forEach((key) => {
        base[key] = visibleSections.includes(key);
      });
    }
    return base;
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const allowedSections = useMemo(() => {
    const all = ['hero', 'benefits', 'curriculum', 'logistics', 'outcomes', 'pricing', 'commitment', 'donation', 'form'] as const;
    return (visibleSections && visibleSections.length > 0) ? visibleSections : [...all];
  }, [visibleSections]);

  const advancedSet = useMemo(() => new Set(advancedSections || []), [advancedSections]);

  const isAllowed = useCallback((section: keyof typeof sections) => {
    return allowedSections.includes(section);
  }, [allowedSections]);

  const shouldRender = useCallback((section: keyof typeof sections) => {
    if (!isAllowed(section)) return false;
    if (advancedSet.has(section) && !showAdvanced) return false;
    return true;
  }, [isAllowed, advancedSet, showAdvanced]);

  // Expanded sections
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    hero: true,
    benefits: true,
    curriculum: true,
    logistics: true,
    outcomes: true,
    pricing: true,
    commitment: true,
    donation: true,
    form: true,
  });

  useEffect(() => {
    // Ensure sections/expanded are disabled for sections outside the allowed list
    setSections(prev => {
      const next = { ...prev } as typeof prev;
      (Object.keys(next) as Array<keyof typeof next>).forEach((key) => {
        if (!isAllowed(key)) next[key] = false;
      });
      return next;
    });
    setExpanded(prev => {
      const next = { ...prev };
      (Object.keys(next) as Array<keyof typeof sections>).forEach((key) => {
        if (!isAllowed(key)) next[key] = false;
      });
      return next;
    });
  }, [isAllowed]);

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
      total_hours: 6,
      session_duration_hours: 2,
      sessions: [],
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
      onDataChange(courseData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseData]);

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

  const hasAdvancedAllowed = useMemo(() => {
    if (!advancedSections || advancedSections.length === 0) return false;
    return advancedSections.some((section) => isAllowed(section as keyof typeof sections));
  }, [advancedSections, isAllowed]);

  // Auto-generate session slots based on total hours and hours per session
  useEffect(() => {
    const total = Number(courseData.logistics.total_hours || 0);
    const perSession = Number(courseData.logistics.session_duration_hours || 0);
    if (!total || !perSession) return;

    const desiredCount = Math.max(0, Math.ceil(total / perSession));
    setCourseData(prev => {
      const current = prev.logistics.sessions || [];
      if (current.length === desiredCount) {
        return prev;
      }
      const next = current.slice(0, desiredCount);
      while (next.length < desiredCount) {
        next.push({ date: '', start_time: '', end_time: '' });
      }
      return {
        ...prev,
        logistics: {
          ...prev.logistics,
          sessions: next,
        },
      };
    });
  }, [courseData.logistics.total_hours, courseData.logistics.session_duration_hours]);

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
      {shouldRender('hero') && (
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
      )}

      {/* Benefits Section */}
      {shouldRender('benefits') && (
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
                  <IconPicker
                    value={benefit.icon}
                    onChange={(val: string) => {
                      const updated = [...courseData.benefits];
                      updated[index] = { ...updated[index], icon: val };
                      updateCourseData('benefits', updated);
                    }}
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
      )}

      {/* Curriculum Section */}
      {shouldRender('curriculum') && (
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
      )}

      {/* Logistics Section */}
      {shouldRender('logistics') && (
      <div>
        <SectionHeader title="Logistics" section="logistics" icon="📅" />
        {sections.logistics && expanded.logistics && (
          <div className="space-y-4 p-4 bg-white/30 rounded-lg">
            {/* Total Hours + Session Duration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">
                  Total Course Hours
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={courseData.logistics.total_hours || ''}
                  onChange={(e) =>
                    updateCourseData('logistics', {
                      ...courseData.logistics,
                      total_hours: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="6"
                  className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">
                  Hours per Session
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={courseData.logistics.session_duration_hours || ''}
                  onChange={(e) =>
                    updateCourseData('logistics', {
                      ...courseData.logistics,
                      session_duration_hours: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="2"
                  className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">
                  Sessions
                </label>
                <div className="w-full px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-gray-900 flex items-center">
                  {(() => {
                    const total = Number(courseData.logistics.total_hours || 0);
                    const perSession = Number(courseData.logistics.session_duration_hours || 0);
                    if (!total || !perSession) {
                      return <span className="text-gray-400 text-sm">Set total & session hours</span>;
                    }
                    const count = Math.ceil(total / perSession);
                    const remainder = total % perSession;
                    return (
                      <span className="text-emerald-700 font-semibold">
                        {count} sessions
                        {remainder !== 0 && (
                          <span className="text-xs text-emerald-600 ml-2">
                            (last session {remainder.toFixed(1)}h)
                          </span>
                        )}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Sessions List (Auto-generated count) */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">
                Session Dates & Times (DD/MM/YYYY, 24h)
              </label>
              <div className="space-y-2">
                {(courseData.logistics.sessions || []).length === 0 ? (
                  <div className="text-sm text-gray-400 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    Set total hours and hours per session to generate sessions.
                  </div>
                ) : (
                  (courseData.logistics.sessions || []).map((session: { date: string; start_time: string; end_time: string }, index: number) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="DD/MM/YYYY"
                        value={session.date}
                        onChange={(e) => {
                          const updated = [...(courseData.logistics.sessions || [])];
                          updated[index] = { ...updated[index], date: e.target.value };
                          updateCourseData('logistics', { ...courseData.logistics, sessions: updated });
                        }}
                        className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="HH:MM"
                        value={session.start_time}
                        onChange={(e) => {
                          const updated = [...(courseData.logistics.sessions || [])];
                          updated[index] = { ...updated[index], start_time: e.target.value };
                          updateCourseData('logistics', { ...courseData.logistics, sessions: updated });
                        }}
                        className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="HH:MM"
                        value={session.end_time}
                        onChange={(e) => {
                          const updated = [...(courseData.logistics.sessions || [])];
                          updated[index] = { ...updated[index], end_time: e.target.value };
                          updateCourseData('logistics', { ...courseData.logistics, sessions: updated });
                        }}
                        className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                      />
                      <div className="text-sm text-gray-500">
                        Session {index + 1}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Modality"
                value={courseData.logistics.modality || ''}
                onChange={(val: string) => updateCourseData('logistics', { ...courseData.logistics, modality: val })}
                placeholder="Virtual (Zoom)"
              />
              <InputField
                label="Tools/Requirements"
                value={courseData.logistics.tools || ''}
                onChange={(val: string) => updateCourseData('logistics', { ...courseData.logistics, tools: val })}
                placeholder="Make.com, OpenAI API"
              />
            </div>
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
      )}

      {/* Outcomes Section */}
      {shouldRender('outcomes') && (
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
      )}

      {/* Pricing Section */}
      {shouldRender('pricing') && (
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
      )}

      {hasAdvancedAllowed && showAdvancedToggle && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => {
              setShowAdvanced((prev) => {
                const next = !prev;
                if (next && advancedSections && advancedSections.length > 0) {
                  setSections((current) => {
                    const updated = { ...current };
                    advancedSections.forEach((key) => {
                      if (isAllowed(key as keyof typeof sections)) {
                        updated[key as keyof typeof sections] = true;
                      }
                    });
                    return updated;
                  });
                }
                return next;
              });
            }}
            className="px-4 py-2 text-sm font-bold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          >
            {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
          </button>
        </div>
      )}

      {/* Commitment Section */}
      {shouldRender('commitment') && (
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
      )}

      {/* Donation Section */}
      {shouldRender('donation') && (
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
      )}

      {/* Form Section */}
      {shouldRender('form') && (
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
                        <div className="space-y-2">
                          <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">
                            Label (Translation Key) <span className="text-red-600">*</span>
                          </label>
                          <select
                            value={field.label_key || ''}
                            onChange={(e) => {
                              const updated = [...courseData.form.fields];
                              const nextKey = e.target.value;
                              updated[index] = {
                                ...updated[index],
                                label_key: nextKey,
                                label: updated[index].label || FORM_LABELS[nextKey] || updated[index].label,
                              };
                              updateCourseData('form', { ...courseData.form, fields: updated });
                            }}
                            className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                          >
                            <option value="">Select translation key...</option>
                            <option value="form.firstName">form.firstName (First Name/Nombre)</option>
                            <option value="form.lastName">form.lastName (Last Name/Apellido)</option>
                            <option value="form.email">form.email (Email)</option>
                            <option value="form.country">form.country (Country/País)</option>
                            <option value="form.birthYear">form.birthYear (Birth Year/Año de nacimiento)</option>
                          </select>
                        </div>
                        <InputField
                          label="Label (Text)"
                          value={field.label || ''}
                          onChange={(val: string) => {
                            const updated = [...courseData.form.fields];
                            updated[index] = { ...updated[index], label: val };
                            updateCourseData('form', { ...courseData.form, fields: updated });
                          }}
                          placeholder="Nombre"
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
                          { name: '', label: '', label_key: '', type: 'text', required: true, placeholder: '' },
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
      )}
    </div>
  );
}
